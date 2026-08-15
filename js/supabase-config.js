// Fill these in once you've created a Supabase project (see
// supabase/README.md for the full setup walkthrough). Until then,
// SUPABASE_CONFIGURED is false and every account/leaderboard feature stays
// quietly disabled -- the site works exactly as it did before, fully
// playable with no sign-up, same as the "no download and no sign up
// required" promise on the homepage. Playing games never requires an
// account; an account only gets you a synced, cross-device profile and a
// spot on the global leaderboards.
//
// Both values below are meant to be public. SUPABASE_ANON_KEY is not a
// secret: it's the public key Supabase's own docs say is safe to ship in
// client-side code, and every table it can touch is locked down by row
// level security policies in supabase/schema.sql, not by this key being
// hidden.
const SUPABASE_URL = 'https://XXXX.supabase.co';
const SUPABASE_ANON_KEY = 'XXXX';
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('XXXX') && !SUPABASE_ANON_KEY.includes('XXXX');

// The Supabase JS SDK is loaded from a CDN (see the <script> tag right
// before this file on every page that needs it) as the global `supabase`
// factory function, which we immediately shadow with the actual client
// instance -- every other file in this project just uses `supabase.auth`,
// `supabase.from(...)`, etc, the same way the Supabase docs show.
const supabaseClient = SUPABASE_CONFIGURED
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
