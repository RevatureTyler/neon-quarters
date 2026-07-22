// AdSense integration. Fill in ADSENSE_CLIENT (and the data-ad-slot values in
// index.html / game.html) once your AdSense account is approved, see the
// README's "Turning ads on" section. Until then, ADSENSE_CONFIGURED is false
// and every .ad-slot just shows its current placeholder box, so the layout
// looks intentional instead of broken.
const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // TODO: replace after approval
const ADSENSE_CONFIGURED = !ADSENSE_CLIENT.includes('XXXX');

let adsenseLoadPromise = null;
function loadAdsenseScript() {
  if (adsenseLoadPromise) return adsenseLoadPromise;
  adsenseLoadPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });
  return adsenseLoadPromise;
}

function fillAdSlot(el) {
  const slotId = el.dataset.adSlot;
  if (!slotId) return;
  el.innerHTML = '';
  el.classList.remove('ad-slot');
  el.classList.add('ad-unit');
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
  ins.setAttribute('data-ad-slot', slotId);
  ins.setAttribute('data-ad-format', 'auto');
  ins.setAttribute('data-full-width-responsive', 'true');
  el.appendChild(ins);
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}

function initAdSlots() {
  const slots = document.querySelectorAll('.ad-slot[data-ad-slot]');
  if (!slots.length || !ADSENSE_CONFIGURED) return;

  nqLoadIfConsented(() => {
    loadAdsenseScript().then(() => {
      slots.forEach((el, i) => {
        // The first slot on a page is normally above the fold, so it fills
        // right away. The rest lazy load once they're about to scroll into
        // view, so we're not paying for ad requests nobody ever sees.
        if (i === 0) { fillAdSlot(el); return; }
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              fillAdSlot(el);
              observer.unobserve(el);
            }
          });
        }, { rootMargin: '200px' });
        observer.observe(el);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initAdSlots);
