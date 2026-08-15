# Setting up accounts + global leaderboards

Everything in the site already handles this being turned off: games are fully
playable, favorites/ratings/high scores/achievements all work locally, with
zero setup. This is purely additive -- do it whenever you want, or never.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is
   plenty for a hobby-scale site: 500MB database, 50k monthly active users).
2. Create a new project. Pick any name/region; note the database password
   it generates (you likely won't need it again, this app never connects
   directly to Postgres, only through Supabase's own API).
3. Wait for the project to finish provisioning (a minute or two).

## 2. Run the schema

1. In your project's dashboard, open **SQL Editor** in the left sidebar.
2. Click **New query**, paste in the entire contents of `supabase/schema.sql`
   from this repo, and click **Run**.
3. You should see "Success. No rows returned." If you get an error, it's
   almost certainly because you ran it against a project that isn't brand
   new (a table already exists with a conflicting shape) -- the script is
   safe to re-run on a fresh project, but isn't a migration tool for
   changing an already-customized schema.

## 3. Get your API credentials

1. In the dashboard, go to **Project Settings -> API**.
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`) and
   the **anon / public** key (a long string starting with `eyJ...`). Do NOT
   use the `service_role` key anywhere in this project -- that one bypasses
   row level security entirely and must never end up in client-side code.
3. Open `js/supabase-config.js` in this repo and replace the two placeholder
   values:
   ```js
   const SUPABASE_URL = 'https://abcdefgh.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...';
   ```
4. That's it. `SUPABASE_CONFIGURED` in that same file flips to `true`
   automatically once neither value contains `XXXX`, and every account
   widget, sign-up/sign-in form, and leaderboard section on the site turns
   itself on.

## 4. (Recommended) Turn off email confirmation for faster testing

By default, Supabase requires confirming your email address before a new
account can sign in, which means testing sign-up locally means actually
receiving an email. To skip that while you're testing:

1. **Authentication -> Providers -> Email** in the dashboard.
2. Turn off **Confirm email**.
3. Turn it back on before real users start signing up, unless you're fine
   with unconfirmed emails (that setting is a judgment call, not something
   this project has an opinion on).

## 5. Verify it works

1. Serve the site locally (see the main README) and open `account.html`.
2. Create an account. Check **Table Editor -> profiles** in the Supabase
   dashboard -- you should see a new row with your username, created
   automatically by the `handle_new_user` trigger in the schema.
3. Play a game that has score tracking (2048 or Asteroids -- see
   `js/scores.js`), beat your local high score, then check **Table Editor
   -> scores** for a new row.
4. Visit `leaderboards.html`, pick that game from the Global Leaderboard
   dropdown, and confirm your score and username show up.

## What this does NOT include

- **OAuth (Google/GitHub/etc sign-in).** Only email/password is wired up.
  Supabase supports OAuth providers with a few lines of config on both
  their dashboard and in `js/auth.js`, but each provider needs you to
  register an OAuth app with that provider first, which is a manual step
  outside this repo. Worth adding later if password sign-up friction turns
  out to matter.
- **Self-service account deletion.** Deleting an `auth.users` row requires
  the `service_role` key (admin-only), which this static site correctly
  never has access to. For now, account.html just tells signed-in users to
  email you a deletion request. A proper self-service delete button would
  need a small serverless function (a Supabase Edge Function is the natural
  place) holding the service role key server-side -- a reasonable next step
  if this ever gets enough real users for manual deletion requests to
  become a burden, but not worth building speculatively before that's true.
- **Rate limiting on score submissions.** Nothing currently stops a
  motivated user from opening devtools and inserting fake rows directly
  into `scores` via the Supabase client (row level security only checks
  that `user_id` matches the signed-in user, not that the score is
  plausible). Fine for a hobby leaderboard; revisit if this site ever has
  enough traffic that leaderboard integrity actually matters to someone.
