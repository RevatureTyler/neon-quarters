// Thin wrapper around supabase.auth, plus a `profiles` lookup since the
// public username lives there, not on the auth user itself (see
// supabase/schema.sql -- auth.users has an email, which is private; the
// leaderboard needs a public handle instead). Every function here is a
// no-op-ish safe fallback when SUPABASE_CONFIGURED is false, so pages that
// load this script don't need their own "is this even set up" checks.

async function nqSignUp(email, password, username) {
  if (!SUPABASE_CONFIGURED) return { error: 'Accounts aren\'t set up on this site yet.' };
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) return { error: error.message };
  // Supabase's default project settings require confirming your email
  // before a session exists. If sign-up succeeded but there's no session
  // yet, that's the expected "check your inbox" case, not a failure.
  if (data.user && !data.session) {
    return { needsEmailConfirmation: true };
  }
  return { user: data.user };
}

async function nqSignIn(email, password) {
  if (!SUPABASE_CONFIGURED) return { error: 'Accounts aren\'t set up on this site yet.' };
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user };
}

async function nqSignOut() {
  if (!SUPABASE_CONFIGURED) return;
  await supabaseClient.auth.signOut();
}

async function nqGetSession() {
  if (!SUPABASE_CONFIGURED) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function nqGetProfile(userId) {
  if (!SUPABASE_CONFIGURED || !userId) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.username;
}

// Fires `callback(session, username)` immediately with the current state,
// then again every time it changes (sign in, sign out, token refresh).
// This is the one entry point every page's own script should use instead
// of calling supabase.auth.onAuthStateChange directly, so the username
// lookup above always happens consistently alongside the session.
function nqOnAuthChange(callback) {
  if (!SUPABASE_CONFIGURED) { callback(null, null); return; }
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    const username = session ? await nqGetProfile(session.user.id) : null;
    callback(session, username);
  });
}
