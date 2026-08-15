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

// Usernames come from other players' accounts (via Supabase, not from
// GAMES.json like everything else this file renders), so unlike the rest
// of this file, this one value is genuinely untrusted input before it goes
// into innerHTML below. The database's CHECK constraint on
// public.profiles.username (supabase/schema.sql) already restricts it to
// [a-zA-Z0-9_], but escaping here too costs nothing and doesn't depend on
// that constraint never changing.
function lbEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Global leaderboard is per-game (the `public.leaderboard` view in
// supabase/schema.sql is keyed by game_id), so this needs a game picker
// rather than one combined list. Only shown at all once SUPABASE_CONFIGURED
// -- with no backend configured there's nothing to query, so the section
// stays hidden exactly like it would if this feature didn't exist yet.
async function renderGlobalLeaderboard(gameId) {
  const list = document.getElementById('globalList');
  const emptyNote = document.getElementById('globalEmptyNote');
  list.innerHTML = '<li style="opacity:0.6;">Loading…</li>';
  const { data, error } = await supabaseClient
    .from('leaderboard')
    .select('username, best_score, rank')
    .eq('game_id', gameId)
    .order('rank', { ascending: true })
    .limit(10);

  if (error || !data || !data.length) {
    list.innerHTML = '';
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;
  list.innerHTML = data.map(r => `
    <li>
      <span class="leaderboard-item">
        <span class="rank">#${r.rank}</span>
        <span class="lb-title">@${lbEscapeHtml(r.username)}</span>
        <span class="lb-count">${Number(r.best_score).toLocaleString()} pts</span>
      </span>
    </li>
  `).join('');
}

function initGlobalLeaderboard() {
  if (!SUPABASE_CONFIGURED) return;
  const section = document.getElementById('globalSection');
  const select = document.getElementById('globalGameSelect');
  section.hidden = false;
  document.getElementById('globalTab').hidden = false;
  select.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  select.addEventListener('change', () => renderGlobalLeaderboard(select.value));
  renderGlobalLeaderboard(select.value);
}

window.gamesReady.then(() => {
  renderHighScores();
  renderMostPlayed();
  renderTopRated();
  renderFavoritesList();
  initGlobalLeaderboard();
});
