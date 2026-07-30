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

// Shared by the three ranked lists below (high scores, most played, top
// rated): same markup, only how the entries are gathered/sorted and what
// the count column shows differs.
function renderRankedList(sectionId, listId, entries, countLabel) {
  const section = document.getElementById(sectionId);
  const list = document.getElementById(listId);
  const ranked = entries.filter(r => r.game);

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
        <span class="lb-count">${countLabel(r)}</span>
      </a>
    </li>
  `).join('');
}

function renderHighScores() {
  const scores = lbGetHighScores();
  const ranked = Object.entries(scores)
    .map(([id, score]) => ({ game: GAMES.find(g => g.id === id), score }))
    .sort((a, b) => b.score - a.score);
  renderRankedList('highScoresSection', 'highScoresList', ranked, r => `${r.score.toLocaleString()} pts`);
}

function renderMostPlayed() {
  const plays = lbGetPlays();
  const ranked = Object.entries(plays)
    .map(([id, count]) => ({ game: GAMES.find(g => g.id === id), count }))
    .sort((a, b) => b.count - a.count);
  renderRankedList('mostPlayedSection', 'mostPlayedList', ranked, r => `${r.count} play${r.count > 1 ? 's' : ''}`);
}

function renderTopRated() {
  const ratings = lbGetRatings();
  const ranked = Object.entries(ratings)
    .map(([id, rating]) => ({ game: GAMES.find(g => g.id === id), rating }))
    .sort((a, b) => b.rating - a.rating);
  renderRankedList('topRatedSection', 'topRatedList', ranked, r => `${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}`);
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
  grid.innerHTML = games.map(g => renderGameCard(g)).join('');
}

window.gamesReady.then(() => {
  renderHighScores();
  renderMostPlayed();
  renderTopRated();
  renderFavoritesList();
});
