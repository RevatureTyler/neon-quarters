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
