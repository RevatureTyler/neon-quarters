// Cookie consent banner. Decision is stored in localStorage only (no cookie
// of its own, no server). Nothing on this site currently sets ad cookies —
// this exists so the mechanism is ready before real ads go live.
//
// When you add a real ad script (e.g. AdSense) later, don't drop it in as a
// raw <script> tag — wrap it like this so it only loads after consent:
//   nqLoadIfConsented(() => {
//     const s = document.createElement('script');
//     s.src = 'https://pagead2.googlesyndication.com/...';
//     s.async = true;
//     document.head.appendChild(s);
//   });
const COOKIE_CONSENT_KEY = 'nq-cookie-consent';

// Callbacks registered before the visitor has made a choice yet (the usual
// case for a first-time visitor, since the banner is still up when ad slots
// first check for consent). Run once accept happens, whenever that is.
const pendingConsentCallbacks = [];

function getCookieConsent() {
  return localStorage.getItem(COOKIE_CONSENT_KEY); // 'accepted' | 'declined' | null
}

function setCookieConsent(value) {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  if (value === 'accepted') {
    pendingConsentCallbacks.splice(0).forEach((fn) => fn());
  }
}

function nqLoadIfConsented(loadFn) {
  const consent = getCookieConsent();
  if (consent === 'accepted') {
    loadFn();
  } else if (consent === null) {
    pendingConsentCallbacks.push(loadFn);
  }
}
window.nqLoadIfConsented = nqLoadIfConsented;

function initCookieBanner() {
  if (getCookieConsent()) return;

  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <p>We use ads to keep this site free. Once enabled, accepting lets us show
    personalized ads via cookies. Declining keeps you to non personalized ones
    only. See our <a href="privacy.html">Privacy Policy</a>.</p>
    <div class="cookie-banner-actions">
      <button type="button" id="cookieDecline" class="cookie-btn cookie-btn-ghost">Decline</button>
      <button type="button" id="cookieAccept" class="cookie-btn">Accept</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('cookieAccept').addEventListener('click', () => {
    setCookieConsent('accepted');
    banner.remove();
  });
  document.getElementById('cookieDecline').addEventListener('click', () => {
    setCookieConsent('declined');
    banner.remove();
  });
}

document.addEventListener('DOMContentLoaded', initCookieBanner);
