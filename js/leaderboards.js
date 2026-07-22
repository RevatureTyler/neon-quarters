// Renders leaderboards.html. Deliberately self-contained (doesn't reuse
// site.js) since this page has its own DOM and site.js's own gamesReady
// callback assumes homepage-only elements exist.

function lbGetPlays() {
  try { return JSON.parse(localStorage.getItem('nq-plays') || '{}'); }
  catch (e) { return {}; }
}

function lbGetFavorites() {
  try { return JSON.parse(localStorage.getItem('nq-favorites') || '[]'); }
  catch (e) { return []; }
}

function lbGetRatings() {
  try { return JSON.parse(localStorage.getItem('nq-ratings') || '{}'); }
  catch (e) { return {}; }
}

function lbGetHighScores() {
  try { return JSON.parse(localStorage.getItem('nq-highscores') || '{}'); }
  catch (e) { return {}; }
}

function renderHighScores() {
  const section = document.getElementById('highScoresSection');
  const list = document.getElementById('highScoresList');
  const scores = lbGetHighScores();
  const ranked = Object.entries(scores)
    .map(([id, score]) => ({ game: GAMES.find(g => g.id === id), score }))
    .filter(r => r.game)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    section.querySelector('.empty-note').hidden = false;
    list.innerHTML = '';
    return;
  }
  section.querySelector('.empty-note').hidden = true;
  list.innerHTML = ranked.map((r, i) => `
    <li>
      <a href="game.html?id=${encodeURIComponent(r.game.id)}" class="leaderboard-item">
        <span class="rank">#${i + 1}</span>
        <span class="lb-thumb"><img src="${r.game.thumb}" alt="${r.game.title}" loading="lazy"></span>
        <span class="lb-title">${r.game.title}</span>
        <span class="lb-count">${r.score.toLocaleString()} pts</span>
      </a>
    </li>
  `).join('');
}

function renderMostPlayed() {
  const section = document.getElementById('mostPlayedSection');
  const list = document.getElementById('mostPlayedList');
  const plays = lbGetPlays();
  const ranked = Object.entries(plays)
    .map(([id, count]) => ({ game: GAMES.find(g => g.id === id), count }))
    .filter(r => r.game)
    .sort((a, b) => b.count - a.count);

  if (!ranked.length) {
    section.querySelector('.empty-note').hidden = false;
    list.innerHTML = '';
    return;
  }
  section.querySelector('.empty-note').hidden = true;
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

function renderTopRated() {
  const section = document.getElementById('topRatedSection');
  const list = document.getElementById('topRatedList');
  const ratings = lbGetRatings();
  const ranked = Object.entries(ratings)
    .map(([id, rating]) => ({ game: GAMES.find(g => g.id === id), rating }))
    .filter(r => r.game)
    .sort((a, b) => b.rating - a.rating);

  if (!ranked.length) {
    section.querySelector('.empty-note').hidden = false;
    list.innerHTML = '';
    return;
  }
  section.querySelector('.empty-note').hidden = true;
  list.innerHTML = ranked.map((r, i) => `
    <li>
      <a href="game.html?id=${encodeURIComponent(r.game.id)}" class="leaderboard-item">
        <span class="rank">#${i + 1}</span>
        <span class="lb-thumb"><img src="${r.game.thumb}" alt="${r.game.title}" loading="lazy"></span>
        <span class="lb-title">${r.game.title}</span>
        <span class="lb-count">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
      </a>
    </li>
  `).join('');
}

function renderFavoritesList() {
  const section = document.getElementById('favoritesSection');
  const grid = document.getElementById('favoritesGrid');
  const favs = lbGetFavorites();
  const games = GAMES.filter(g => favs.includes(g.id));

  if (!games.length) {
    section.querySelector('.empty-note').hidden = false;
    grid.innerHTML = '';
    return;
  }
  section.querySelector('.empty-note').hidden = true;
  grid.innerHTML = games.map(g => `
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

window.gamesReady.then(() => {
  renderHighScores();
  renderMostPlayed();
  renderTopRated();
  renderFavoritesList();
});
