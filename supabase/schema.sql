-- Neon Quarters: accounts + shared leaderboards schema.
--
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL
-- Editor -> New query -> paste this whole file -> Run). Safe to re-run:
-- everything is IF NOT EXISTS / OR REPLACE.
--
-- This does NOT touch Supabase's built-in `auth.users` table -- that's
-- managed entirely by Supabase Auth (email/password sign-up, sessions,
-- password reset emails, etc). Everything below is app data that hangs off
-- of it via `user_id uuid references auth.users(id)`.

-- ---------------------------------------------------------------------
-- profiles: one row per account, holds the public-facing username.
-- auth.users has an email, but email is private; the leaderboard needs a
-- public handle instead. Created automatically on sign-up via the trigger
-- below, so the client never inserts into this table directly.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20 and username ~ '^[a-zA-Z0-9_]+$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row right after sign-up, using the username the
-- client passed in as sign-up metadata (see js/auth.js: signUp() passes
-- `options.data.username`). Runs as the table owner (security definer), so
-- it works even though the client itself has no insert policy on profiles.
--
-- Known rough edge: this insert can fail (duplicate username, or one that
-- fails the check constraint above), and since it runs inside the same
-- transaction as the auth.users insert, that failure rolls back the whole
-- sign-up -- the visitor gets whatever raw error Postgres/Supabase surfaces
-- rather than a friendly "username taken" message. Fine for a first pass;
-- a nicer version would check availability client-side before submitting.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- scores: append-only log of score submissions. Every play that beats a
-- personal best gets inserted (see js/cloud-sync.js); we keep full history
-- rather than a single mutable "best score" row, both because it's simpler
-- (insert-only, no read-modify-write race) and because it leaves room for
-- a "recent plays" or "score over time" view later without a schema change.
-- ---------------------------------------------------------------------
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  score numeric not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists scores_game_id_score_idx on public.scores (game_id, score desc);
create index if not exists scores_user_id_idx on public.scores (user_id);

alter table public.scores enable row level security;

drop policy if exists "scores are publicly readable" on public.scores;
create policy "scores are publicly readable"
  on public.scores for select
  using (true);

drop policy if exists "users can submit their own scores" on public.scores;
create policy "users can submit their own scores"
  on public.scores for insert
  with check (auth.uid() = user_id);

-- Each player's single best score per game, joined to their username, with
-- a global rank. This is what the leaderboard page actually queries --
-- select from this view instead of the raw `scores` table, and never
-- expose `user_id`/email to the client, only `username`.
create or replace view public.leaderboard as
select
  game_id,
  username,
  best_score,
  rank() over (partition by game_id order by best_score desc) as rank
from (
  select distinct on (s.game_id, s.user_id)
    s.game_id,
    p.username,
    s.score as best_score
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.game_id, s.user_id, s.score desc
) best_per_user;

-- ---------------------------------------------------------------------
-- plays: one row per play, mirrors js/player.js's trackPlay(). Deliberately
-- not a mutable "play count" counter, same append-only reasoning as scores.
-- Play count per game is just row count; js/achievements.js's "Regular",
-- "Dedicated", etc. badges are computed from this client-side exactly like
-- they already are from localStorage, so there's no separate achievements
-- table -- achievements were never anything but a derived view over
-- plays/favorites/ratings/scores, cloud or not.
-- ---------------------------------------------------------------------
create table if not exists public.plays (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  played_at timestamptz not null default now()
);

create index if not exists plays_user_id_idx on public.plays (user_id);

alter table public.plays enable row level security;

drop policy if exists "users manage their own plays" on public.plays;
create policy "users manage their own plays"
  on public.plays for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- favorites / ratings: mirrors what js/leaderboards.js already tracks in
-- localStorage. Both are private to the owning user (no public read
-- policy) -- the only thing surfaced publicly from either is the per-game
-- rating average below, never who rated what.
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.favorites enable row level security;

drop policy if exists "users manage their own favorites" on public.favorites;
create policy "users manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.ratings enable row level security;

drop policy if exists "users manage their own ratings" on public.ratings;
create policy "users manage their own ratings"
  on public.ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public aggregate: average rating + count per game, no user_id exposed.
create or replace view public.rating_summary as
select game_id, round(avg(rating)::numeric, 2) as average_rating, count(*) as rating_count
from public.ratings
group by game_id;

-- ---------------------------------------------------------------------
-- Grants. RLS above is the real gate; these grants just allow the
-- anon/authenticated roles (the two Supabase's client SDK ever connects
-- as) to run statements against these tables/views at all. `anon` gets
-- read-only public data so a logged-out visitor can still see the
-- leaderboard; write access always requires `authenticated` + RLS.
-- ---------------------------------------------------------------------
grant select on public.profiles, public.scores, public.leaderboard, public.rating_summary to anon, authenticated;
grant insert on public.scores to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.favorites, public.ratings, public.plays to authenticated;
