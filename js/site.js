let activeGenre = 'all';
let searchQuery = '';
let sortMode = 'newest';
const GENRE_SHAPES = ['circle', 'diamond', 'square'];
const GENRE_ACCENTS = ['var(--cyan)', 'var(--magenta)', 'var(--amber)', 'var(--violet)'];

function setActiveGenre(genre) {
  activeGenre = genre;
  document.querySelectorAll('#filterBar button').forEach(b => b.classList.toggle('active', b.dataset.genre === genre));
  document.querySelectorAll('#genreRow .genre-chip').forEach(c => c.classList.toggle('active', c.dataset.genre === genre));
  renderGrid();
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('nq-favorites') || '[]'); }
  catch (e) { return []; }
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) favs.push(id); else favs.splice(idx, 1);
  localStorage.setItem('nq-favorites', JSON.stringify(favs));
  return favs;
}

function renderFavorites() {
  const section = document.getElementById('favoritesSection');
  const grid = document.getElementById('favoritesGrid');
  if (!section || !grid) return;
  const favs = getFavorites();
  const games = GAMES.filter(g => favs.includes(g.id));
  if (!games.length) { section.hidden = true; return; }
  section.hidden = false;
  grid.innerHTML = games.map(g => `
    <a href="game.html?id=${encodeURIComponent(g.id)}" class="game-card">
      <button type="button" class="fav-toggle active" data-id="${g.id}" aria-label="Remove from favorites">♥</button>
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

function renderGrid() {
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  const q = searchQuery.trim().toLowerCase();
  const list = GAMES
    .filter(g => activeGenre === 'all' || g.genre === activeGenre)
    .filter(g => !q || g.title.toLowerCase().includes(q));

  list.sort((a, b) => sortMode === 'title'
    ? a.title.localeCompare(b.title)
    : new Date(b.added || 0) - new Date(a.added || 0));

  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-dim); font-size:0.8rem;">No games match your search.</p>';
    return;
  }

  list.forEach(g => {
    const favs = getFavorites();
    const isFav = favs.includes(g.id);
    const card = document.createElement('a');
    card.href = `game.html?id=${encodeURIComponent(g.id)}`;
    card.className = 'game-card';
    card.innerHTML = `
      <button type="button" class="fav-toggle${isFav ? ' active' : ''}" data-id="${g.id}" aria-label="${isFav ? 'Remove from' : 'Add to'} favorites">${isFav ? '♥' : '♡'}</button>
      <button type="button" class="quick-view" data-id="${g.id}">QUICK VIEW</button>
      <div class="thumb"><img src="${g.thumb}" alt="${g.title}" loading="lazy"></div>
      <div class="info">
        <p class="title">${g.title}</p>
        <div class="badges">
          <span class="genre">${g.genre}</span>
          <span class="license-badge">${g.license}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderFilters() {
  const bar = document.getElementById('filterBar');
  bar.querySelectorAll('.skeleton').forEach(el => el.remove());
  const genres = [...new Set(GAMES.map(g => g.genre))];
  genres.forEach(genre => {
    const btn = document.createElement('button');
    btn.textContent = genre;
    btn.dataset.genre = genre;
    bar.appendChild(btn);
  });

  bar.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    setActiveGenre(e.target.dataset.genre);
  });
}

function renderGenreRow() {
  const row = document.getElementById('genreRow');
  if (!row) return;
  const genres = [...new Set(GAMES.map(g => g.genre))];
  row.innerHTML = genres.map((genre, i) => `
    <button type="button" class="genre-chip" data-genre="${genre}" style="--accent:${GENRE_ACCENTS[i % GENRE_ACCENTS.length]}">
      <span class="genre-icon shape-${GENRE_SHAPES[i % GENRE_SHAPES.length]}"></span>
      ${genre}
    </button>
  `).join('');
  row.addEventListener('click', (e) => {
    const chip = e.target.closest('.genre-chip');
    if (!chip) return;
    setActiveGenre(chip.dataset.genre);
  });
}

function renderSearch() {
  const input = document.getElementById('gameSearch');
  if (!input) return;
  input.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderGrid();
  });
}

function renderSort() {
  const select = document.getElementById('gameSort');
  if (!select) return;
  select.value = sortMode;
  select.addEventListener('change', (e) => {
    sortMode = e.target.value;
    renderGrid();
  });
}

function renderFeatured() {
  const el = document.getElementById('featuredGame');
  if (!el || !GAMES.length) return;
  const g = GAMES[0];
  el.innerHTML = `
    <p class="fg-label">FEATURED</p>
    <a href="game.html?id=${encodeURIComponent(g.id)}" class="fg-card">
      <div class="fg-thumb"><img src="${g.thumb}" alt="${g.title}"></div>
      <div class="fg-info">
        <p class="fg-title">${g.title}</p>
        <span class="btn fg-play">PLAY NOW</span>
      </div>
    </a>
  `;
}

function openPreview(id) {
  const g = GAMES.find(x => x.id === id);
  const overlay = document.getElementById('previewOverlay');
  if (!g || !overlay) return;
  document.getElementById('previewBody').innerHTML = `
    <div class="modal-thumb"><img src="${g.thumb}" alt="${g.title}"></div>
    <div class="modal-info">
      <p class="title">${g.title}</p>
      <div class="badges">
        <span class="genre">${g.genre}</span>
        <span class="license-badge">${g.license}</span>
      </div>
      <p class="credit">Credit: ${g.credit} · <a href="${g.source}" target="_blank" rel="noopener">Source</a></p>
      <a href="game.html?id=${encodeURIComponent(g.id)}" class="btn">PLAY NOW</a>
    </div>
  `;
  overlay.hidden = false;
}

function closePreview() {
  const overlay = document.getElementById('previewOverlay');
  if (overlay) overlay.hidden = true;
}

function initPreviewModal() {
  const grid = document.getElementById('gameGrid');
  const overlay = document.getElementById('previewOverlay');
  if (!grid || !overlay) return;
  grid.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-toggle');
    if (favBtn) {
      e.preventDefault();
      toggleFavorite(favBtn.dataset.id);
      renderGrid();
      renderFavorites();
      return;
    }
    const btn = e.target.closest('.quick-view');
    if (!btn) return;
    e.preventDefault();
    openPreview(btn.dataset.id);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePreview();
  });
  document.getElementById('previewClose').addEventListener('click', closePreview);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
}

function renderLeaderboard() {
  const section = document.getElementById('leaderboard');
  const list = document.getElementById('leaderboardList');
  if (!section || !list) return;
  let plays = {};
  try { plays = JSON.parse(localStorage.getItem('nq-plays') || '{}'); } catch (e) {}
  const ranked = Object.entries(plays)
    .map(([id, count]) => ({ game: GAMES.find(g => g.id === id), count }))
    .filter(r => r.game)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (!ranked.length) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = ranked.map((r, i) => `
    <li>
      <a href="game.html?id=${encodeURIComponent(r.game.id)}" class="leaderboard-item">
        <span class="rank">#${i + 1}</span>
        <span class="lb-thumb"><img src="${r.game.thumb}" alt="${r.game.title}" loading="lazy"></span>
        <span class="lb-title">${r.game.title}</span>
        <span class="lb-count">${r.count} play${r.count > 1 ? 's' : ''}</span>
      </a>
    </li>
  `).join('');
}

window.gamesReady.then(() => {
  renderFilters();
  renderGenreRow();
  renderSearch();
  renderSort();
  renderGrid();
  renderFeatured();
  renderLeaderboard();
  renderFavorites();
  initPreviewModal();

  document.getElementById('favoritesGrid').addEventListener('click', (e) => {
    const favBtn = e.target.closest('.fav-toggle');
    if (!favBtn) return;
    e.preventDefault();
    toggleFavorite(favBtn.dataset.id);
    renderGrid();
    renderFavorites();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    document.getElementById('newsletterMsg').hidden = false;
  });
});
