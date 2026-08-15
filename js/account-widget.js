// Injects a small "Sign In" / "@username" link into the header next to the
// theme toggle on every page that includes this script, so account state
// is visible site-wide without hand-editing every page's header markup.
// Also owns window.nqCurrentUser, the one shared signal cloud-sync.js and
// any page-specific script (account.html, leaderboards.html) check to
// decide whether to show/sync signed-in state.

window.nqCurrentUser = null;

function nqRenderAccountWidget(session, username) {
  window.nqCurrentUser = session ? session.user : null;

  let link = document.getElementById('accountWidget');
  if (!link) {
    link = document.createElement('a');
    link.id = 'accountWidget';
    link.className = 'theme-toggle';
    link.style.cssText = 'font-family:"JetBrains Mono",monospace; font-size:0.7rem; width:auto; padding:0 0.7rem; text-decoration:none;';
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle && themeToggle.parentNode) {
      themeToggle.parentNode.insertBefore(link, themeToggle);
    }
  }

  if (!SUPABASE_CONFIGURED) {
    // Accounts aren't set up on this deployment yet -- stay invisible
    // rather than link to a page that can't do anything.
    link.hidden = true;
    return;
  }
  link.hidden = false;
  link.href = 'account.html';
  link.textContent = session ? `@${username || '...'}` : 'SIGN IN';
}

document.addEventListener('DOMContentLoaded', () => {
  if (!SUPABASE_CONFIGURED) { nqRenderAccountWidget(null, null); return; }
  nqOnAuthChange((session, username) => {
    const wasSignedOut = !window.nqCurrentUser;
    nqRenderAccountWidget(session, username);
    if (session && wasSignedOut) nqCloudSyncOnLogin();
  });
});
