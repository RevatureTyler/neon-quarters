// Optional "buy me a coffee"-style support link, same on/off pattern as
// ADSENSE_CLIENT in js/ads.js and SUPABASE_CONFIGURED in js/supabase-config.js:
// fill in a real URL (Ko-fi, Buy Me a Coffee, GitHub Sponsors, etc.) and the
// footer link appears automatically. Until then it stays hidden so there's
// no dead/fake link in the footer.
const SUPPORT_URL = 'https://ko-fi.com/XXXX';
const SUPPORT_CONFIGURED = !SUPPORT_URL.includes('XXXX');

document.addEventListener('DOMContentLoaded', () => {
  if (!SUPPORT_CONFIGURED) return;
  const footer = document.querySelector('footer');
  if (!footer) return;
  const link = document.createElement('p');
  link.innerHTML = `<a href="${SUPPORT_URL}" target="_blank" rel="noopener">☕ Support Neon Quarters</a>`;
  footer.prepend(link);
});
