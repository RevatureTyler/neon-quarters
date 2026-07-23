function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function loadRuffleThen(cb) {
  if (window.RufflePlayer) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'js/ruffle/ruffle.js';
  s.onload = cb;
  s.onerror = cb; // cb itself checks for window.RufflePlayer
  document.head.appendChild(s);
}

function loadGame() {
  const id = getParam('id');
  const game = GAMES.find(g => g.id === id);
  const frame = document.getElementById('playerFrame');

  if (!game) {
    const titleEl = document.getElementById('gameTitle');
    titleEl.textContent = 'Game not found';
    titleEl.className = 'game-title';
    frame.textContent = 'That game could not be found. Head back to the arcade.';
    return;
  }

  document.title = `${game.title} on Neon Quarters`;
  document.getElementById('pageTitle').textContent = document.title;
  document.getElementById('gameTitle').textContent = game.title;
  document.getElementById('gameTitle').className = 'game-title';
  document.getElementById('gameGenre').textContent = game.genre;
  document.getElementById('gameGenre').className = 'genre';
  document.getElementById('gameLicense').textContent = game.license;
  document.getElementById('gameLicense').className = 'license-badge';
  document.getElementById('gameCredit').className = '';
  document.getElementById('gameCredit').innerHTML =
    `Credit: ${game.credit} · <a href="${game.source}" target="_blank" rel="noopener">Source</a>`;

  const tagRow = document.getElementById('tagRow');
  tagRow.innerHTML = (game.tags || [game.genre]).map(t => `<span class="tag-pill">${t}</span>`).join('');

  const descEl = document.getElementById('gameDescription');
  if (game.description) {
    descEl.textContent = game.description;
    descEl.hidden = false;
  } else {
    descEl.hidden = true;
  }

  const howToEl = document.getElementById('howToPlaySection');
  if (game.howToPlay) {
    document.getElementById('howToPlayText').textContent = game.howToPlay;
    howToEl.hidden = false;
  } else {
    howToEl.hidden = true;
  }

  const ogDesc = game.description || `Play ${game.title} free, instantly, in your browser. ${game.genre}, ${game.license} licensed.`;
  document.getElementById('ogTitle').content = `${game.title} on Neon Quarters`;
  document.getElementById('ogDescription').content = ogDesc;
  document.getElementById('ogImage').content = game.thumb;
  document.getElementById('twitterTitle').content = `${game.title} on Neon Quarters`;
  document.getElementById('twitterDescription').content = ogDesc;
  document.getElementById('twitterImage').content = game.thumb;

  renderMoreGames(game);
  renderRating(game.id);
  renderShareRow(game);
  trackPlay(game.id);

  const bioEl = document.getElementById('creatorBio');
  if (game.creatorBio) {
    bioEl.hidden = false;
    document.getElementById('creatorBioText').textContent = game.creatorBio;
  } else {
    bioEl.hidden = true;
  }

  initFavoriteButton(game.id);
  initComments(game.id);

  if (game.type === 'swf') {
    // Ruffle auto-detects <embed>/<object> tags, but we build it explicitly
    // so we control sizing inside player-frame. Loaded on-demand so a missing
    // js/ruffle/ruffle.js (before README step 1 is done) doesn't 404 up front.
    loadRuffleThen(() => {
      const ruffleApi = window.RufflePlayer && window.RufflePlayer.newest();
      if (!ruffleApi) {
        frame.textContent = 'Flash player unavailable. Add js/ruffle/ruffle.js (see README).';
        return;
      }
      const player = ruffleApi.createPlayer();
      player.style.width = '100%';
      player.style.height = '100%';
      frame.appendChild(player);
      player.load(game.path);
    });
  } else if (game.type === 'html5') {
    const iframe = document.createElement('iframe');
    iframe.src = game.path;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('allowfullscreen', 'true');
    frame.appendChild(iframe);
    initHighScore(game.id, iframe);
    if (SELF_SIZING_GAMES.indexOf(game.id) === -1) {
      setupResponsiveIframe(iframe, frame);
    }
    setupTouchToMouse(iframe, frame);
    setupTouchControls(game, iframe);
  }
}

// A few games already resize their own canvas/renderer to fill the iframe
// viewport (reading window.innerWidth/innerHeight directly, sometimes
// reassigning the canvas's drawing-buffer resolution and computing click
// offsets from element layout). Wrapping those in an extra CSS transform
// doesn't help and breaks their own coordinate math, so they're left alone.
const SELF_SIZING_GAMES = ['classic-pool', 'astray', 'bullet-hell', 'lights-out'];

// Most of these games are small fixed-pixel canvas/DOM pages from ~2013-2020
// with no responsive CSS of their own. Rather than patching 21 codebases,
// scale each game's content to fit the actual iframe viewport by measuring
// its natural (unconstrained) size and applying a CSS transform, so it fills
// the player frame on a phone instead of being cropped to its top-left corner.
function setupResponsiveIframe(iframe, frameEl) {
  let pending = false;

  function measureAndScale() {
    let doc;
    try { doc = iframe.contentDocument; } catch (e) { return; }
    if (!doc || !doc.body || !doc.documentElement) return;

    const html = doc.documentElement;
    const body = doc.body;

    // Reset so scrollWidth/Height reflect the page's true natural size,
    // not a previous scale pass.
    html.style.cssText = 'margin:0; padding:0; height:100%; overflow:hidden; display:flex; align-items:center; justify-content:center;';
    body.style.cssText = 'margin:0; padding:0;';

    const naturalW = Math.max(body.scrollWidth, html.scrollWidth);
    const naturalH = Math.max(body.scrollHeight, html.scrollHeight);
    const availW = frameEl.clientWidth;
    const availH = frameEl.clientHeight;
    if (!naturalW || !naturalH || !availW || !availH) return;

    const scale = Math.min(availW / naturalW, availH / naturalH);

    body.style.cssText = `margin:0; padding:0; width:${naturalW}px; height:${naturalH}px; flex:none; transform-origin:center center; transform:scale(${scale});`;
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; measureAndScale(); });
  }

  iframe.addEventListener('load', () => {
    schedule();
    setTimeout(schedule, 300);
    try {
      const doc = iframe.contentDocument;
      if (doc && window.ResizeObserver) {
        new ResizeObserver(schedule).observe(doc.documentElement);
      }
    } catch (e) {}
  });

  if (window.ResizeObserver) {
    new ResizeObserver(schedule).observe(frameEl);
  } else {
    window.addEventListener('resize', schedule);
  }
}

// None of these games listen for touch events, and mobile browsers don't
// synthesize mouse events across an iframe boundary. Translate touches on
// the frame into real mousedown/mousemove/mouseup/click events dispatched
// inside the iframe so mouse-driven games (aiming, dragging, clicking) work
// on a touchscreen. A press held in place without moving fires a
// contextmenu event instead, standing in for a right-click (e.g. flagging
// a tile in Minesweeper).
function setupTouchToMouse(iframe, frameEl) {
  const LONG_PRESS_MS = 450;
  const MOVE_THRESHOLD = 10;
  let state = null;

  function toLocal(touch) {
    const rect = iframe.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function relay(type, x, y, extra) {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) return null;
    const target = doc.elementFromPoint(x, y) || doc.body;
    const evt = new win.MouseEvent(type, Object.assign({
      bubbles: true, cancelable: true, view: win, clientX: x, clientY: y, button: 0
    }, extra || {}));
    target.dispatchEvent(evt);
    return target;
  }

  frameEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const p = toLocal(e.touches[0]);
    state = { startX: p.x, startY: p.y, moved: false, longFired: false, down: false };
    state.timer = setTimeout(() => {
      if (!state || state.moved) return;
      relay('contextmenu', state.startX, state.startY);
      state.longFired = true;
    }, LONG_PRESS_MS);
    e.preventDefault();
  }, { passive: false });

  frameEl.addEventListener('touchmove', (e) => {
    if (!state || e.touches.length !== 1) return;
    const p = toLocal(e.touches[0]);
    if (!state.moved && (Math.abs(p.x - state.startX) > MOVE_THRESHOLD || Math.abs(p.y - state.startY) > MOVE_THRESHOLD)) {
      state.moved = true;
      clearTimeout(state.timer);
    }
    if (state.moved && !state.longFired) {
      if (!state.down) { relay('mousedown', state.startX, state.startY, { buttons: 1 }); state.down = true; }
      relay('mousemove', p.x, p.y, { buttons: 1 });
    }
    e.preventDefault();
  }, { passive: false });

  frameEl.addEventListener('touchend', (e) => {
    if (!state) return;
    clearTimeout(state.timer);
    const t = e.changedTouches[0];
    const p = t ? toLocal(t) : { x: state.startX, y: state.startY };
    if (!state.longFired) {
      if (state.moved) {
        relay('mouseup', p.x, p.y, { buttons: 0 });
      } else {
        relay('mousedown', p.x, p.y, { buttons: 1 });
        relay('mouseup', p.x, p.y, { buttons: 0 });
        relay('click', p.x, p.y, { buttons: 0 });
      }
    }
    state = null;
    e.preventDefault();
  }, { passive: false });

  frameEl.addEventListener('touchcancel', () => {
    if (state) clearTimeout(state.timer);
    state = null;
  });
}

// Per-game virtual control layout for games whose only input is the
// keyboard. Arrow keys are the default d-pad mapping; dpadKeys overrides
// individual directions for games that read WASD instead.
const TOUCH_CONTROL_CONFIGS = {
  'canvas-tetris': {
    dpad: ['left', 'right', 'down'],
    buttons: [
      { label: '⟳', key: 'ArrowUp', keyCode: 38 },
      { label: 'DROP', key: ' ', keyCode: 32 }
    ]
  },
  'js-racer': { dpad: ['left', 'right', 'up', 'down'] },
  'astray': { dpad: ['left', 'right', 'up', 'down'] },
  'html5-asteroids': {
    dpad: ['left', 'right', 'up'],
    buttons: [ { label: 'FIRE', key: ' ', keyCode: 32 } ]
  },
  'star-battle': {
    dpad: ['left', 'right', 'up', 'down'],
    dpadKeys: { left: 'a', right: 'd', up: 'w', down: 's' },
    dpadKeyCodes: { left: 65, right: 68, up: 87, down: 83 },
    buttons: [ { label: 'FIRE', key: ' ', keyCode: 32 } ]
  },
  'bullet-hell': {
    dpad: ['left', 'right', 'up', 'down'],
    buttons: [
      { label: 'FIRE', key: 'z', keyCode: 90 },
      { label: 'BOMB', key: 'c', keyCode: 67 }
    ]
  },
  'classic-pool': {
    buttons: [
      { label: 'POWER +', key: 'w', keyCode: 87 },
      { label: 'POWER -', key: 's', keyCode: 83 }
    ]
  },
  'snake': {
    dpad: ['left', 'right', 'up', 'down'],
    buttons: [ { label: 'RESTART', key: 'r', keyCode: 82 } ]
  },
  'lunar-lander': {
    dpad: ['left', 'right', 'up', 'down'],
    buttons: [ { label: 'RESTART', key: 'r', keyCode: 82 } ]
  }
};

const DPAD_DEFAULT_KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
const DPAD_DEFAULT_KEYCODES = { left: 37, right: 39, up: 38, down: 40 };
const DPAD_ICONS = { left: '←', right: '→', up: '↑', down: '↓' };

function setupTouchControls(game, iframe) {
  const container = document.getElementById('touchControls');
  if (!container) return;
  const config = TOUCH_CONTROL_CONFIGS[game.id];
  if (!config) { container.hidden = true; container.innerHTML = ''; return; }

  function sendKey(type, key, keyCode) {
    const win = iframe.contentWindow;
    if (!win) return;
    const evt = new win.KeyboardEvent(type, {
      bubbles: true, cancelable: true, key: key, code: keyForCode(key),
      keyCode: keyCode, which: keyCode
    });
    win.dispatchEvent(evt);
    if (win.document) win.document.dispatchEvent(evt);
  }

  function keyForCode(key) {
    if (key === ' ') return 'Space';
    if (key.length === 1) return 'Key' + key.toUpperCase();
    return key;
  }

  // Some games only poll key state once per animation frame instead of
  // listening for the keydown edge, so a press released within the same
  // tick (as fast synthetic clicks and very light real taps can be) can
  // come and go between frames without ever being observed. Guarantee the
  // key stays "down" for at least one frame's worth of time.
  const MIN_HOLD_MS = 80;

  function wireButton(el, key, keyCode) {
    let active = false;
    let pressedAt = 0;
    function press(e) {
      e.preventDefault();
      if (active) return;
      active = true;
      pressedAt = performance.now();
      el.classList.add('tc-active');
      sendKey('keydown', key, keyCode);
    }
    function release(e) {
      if (e) e.preventDefault();
      if (!active) return;
      active = false;
      el.classList.remove('tc-active');
      const elapsed = performance.now() - pressedAt;
      const wait = Math.max(0, MIN_HOLD_MS - elapsed);
      setTimeout(() => sendKey('keyup', key, keyCode), wait);
    }
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  container.innerHTML = '';
  container.hidden = false;

  if (config.dpad && config.dpad.length) {
    const dpad = document.createElement('div');
    dpad.className = 'tc-dpad';
    config.dpad.forEach(dir => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tc-btn tc-${dir}`;
      btn.setAttribute('aria-label', dir);
      btn.textContent = DPAD_ICONS[dir];
      const key = (config.dpadKeys && config.dpadKeys[dir]) || DPAD_DEFAULT_KEYS[dir];
      const keyCode = (config.dpadKeyCodes && config.dpadKeyCodes[dir]) || DPAD_DEFAULT_KEYCODES[dir];
      wireButton(btn, key, keyCode);
      dpad.appendChild(btn);
    });
    container.appendChild(dpad);
  }

  if (config.buttons && config.buttons.length) {
    const actions = document.createElement('div');
    actions.className = 'tc-actions';
    config.buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tc-btn';
      btn.setAttribute('aria-label', b.label);
      btn.textContent = b.label;
      wireButton(btn, b.key, b.keyCode);
      actions.appendChild(btn);
    });
    container.appendChild(actions);
  }
}

function initHighScore(gameId, iframe) {
  const block = document.getElementById('highScoreBlock');
  const valueEl = document.getElementById('highScoreValue');
  if (!block || !valueEl || typeof SCORE_READERS === 'undefined' || !SCORE_READERS[gameId]) return;
  block.hidden = false;
  valueEl.textContent = getHighScore(gameId);
  startScoreTracking(gameId, iframe, (best) => { valueEl.textContent = best; });
}

window.gamesReady.then(loadGame);

function trackPlay(gameId) {
  let plays = {};
  try { plays = JSON.parse(localStorage.getItem('nq-plays') || '{}'); } catch (e) {}
  plays[gameId] = (plays[gameId] || 0) + 1;
  localStorage.setItem('nq-plays', JSON.stringify(plays));
}

function renderShareRow(game) {
  const row = document.getElementById('shareRow');
  if (!row) return;
  const shareUrl = window.location.href;
  const shareText = `Playing ${game.title} on Neon Quarters`;
  row.innerHTML = `
    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener" class="back-link">Share on X</a>
    <a href="https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}" target="_blank" rel="noopener" class="back-link">Share on Reddit</a>
    <button id="copyLinkBtn" type="button" class="back-link" style="background:none; font-family:inherit; cursor:pointer;">Copy Link</button>
  `;
  document.getElementById('copyLinkBtn').addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(shareUrl);
    e.target.textContent = 'Copied!';
    setTimeout(() => { e.target.textContent = 'Copy Link'; }, 1500);
  });
}

function initComments(gameId) {
  const key = `nq-comments-${gameId}`;
  const form = document.getElementById('commentForm');
  const list = document.getElementById('commentList');
  if (!form || !list) return;

  function load() {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (e) { return []; }
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    const comments = load();
    if (!comments.length) {
      list.innerHTML = '<li class="comment-empty">No comments yet. Be the first.</li>';
      return;
    }
    list.innerHTML = comments.slice().reverse().map(c => `
      <li class="comment-item">
        <div class="c-head"><span class="c-name">${esc(c.name)}</span><span>${new Date(c.time).toLocaleDateString()}</span></div>
        <p class="c-body">${esc(c.text)}</p>
      </li>
    `).join('');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');
    const text = textInput.value.trim();
    if (!text) return;
    const comments = load();
    comments.push({ name: nameInput.value.trim() || 'Anonymous', text, time: Date.now() });
    localStorage.setItem(key, JSON.stringify(comments));
    textInput.value = '';
    render();
  });

  render();
}

function initFavoriteButton(gameId) {
  const btn = document.getElementById('favBtn');
  if (!btn) return;
  function getFavs() {
    try { return JSON.parse(localStorage.getItem('nq-favorites') || '[]'); }
    catch (e) { return []; }
  }
  function sync() {
    const isFav = getFavs().includes(gameId);
    btn.classList.toggle('active', isFav);
    btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
    btn.textContent = isFav ? '♥ Favorited' : '♡ Favorite';
  }
  btn.addEventListener('click', () => {
    const favs = getFavs();
    const idx = favs.indexOf(gameId);
    if (idx === -1) favs.push(gameId); else favs.splice(idx, 1);
    localStorage.setItem('nq-favorites', JSON.stringify(favs));
    sync();
  });
  sync();
}

function getRatings() {
  try { return JSON.parse(localStorage.getItem('nq-ratings') || '{}'); }
  catch (e) { return {}; }
}

function renderRating(gameId) {
  const container = document.getElementById('ratingStars');
  const status = document.getElementById('ratingStatus');
  if (!container) return;
  const ratings = getRatings();
  let current = ratings[gameId] || 0;

  function paint(value) {
    container.querySelectorAll('button').forEach(b => {
      b.classList.toggle('filled', Number(b.dataset.value) <= value);
      b.textContent = Number(b.dataset.value) <= value ? '★' : '☆';
    });
  }

  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.value = i;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', i === current ? 'true' : 'false');
    btn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''}`);
    btn.addEventListener('mouseenter', () => paint(i));
    btn.addEventListener('mouseleave', () => paint(current));
    btn.addEventListener('click', () => {
      current = i;
      const all = getRatings();
      all[gameId] = i;
      localStorage.setItem('nq-ratings', JSON.stringify(all));
      paint(current);
      status.textContent = 'Saved, thanks!';
    });
    container.appendChild(btn);
  }
  paint(current);
  status.textContent = current ? 'You rated this game.' : '';
}

function renderMoreGames(current) {
  const grid = document.getElementById('moreGrid');
  if (!grid) return;
  const others = GAMES.filter(g => g.id !== current.id).slice(0, 4);
  grid.innerHTML = others.map(g => `
    <a href="game.html?id=${encodeURIComponent(g.id)}" class="game-card">
      <div class="thumb"><img src="${g.thumb}" alt="${g.title}" loading="lazy"></div>
      <div class="info">
        <p class="title">${g.title}</p>
        <div class="badges">
          <span class="genre">${g.genre}</span>
          <span class="license-badge">${g.license}</span>
        </div>
      </div>
    </a>
  `).join('');
}
