// Loads the game catalog. Kept as a separate file so adding a new game later
// is just: edit games/games.json, no code changes needed.
let GAMES = [];

async function loadGames() {
  const res = await fetch('games/games.json');
  GAMES = await res.json();
  document.dispatchEvent(new Event('games-loaded'));
  return GAMES;
}

// Promise-based hook so listeners registered after the fetch already
// resolved (or that never get a chance to catch the event) still run.
window.gamesReady = loadGames();

// Shared .game-card markup, used on the homepage grid/favorites, the "more
// games" row on a game's own page, and the leaderboards favorites list.
// favToggle/quickView are opt-in since not every one of those spots wants
// both buttons.
function renderGameCard(game, opts = {}) {
  const favBtn = opts.favToggle
    ? `<button type="button" class="fav-toggle${opts.isFavorite ? ' active' : ''}" data-id="${game.id}" aria-label="${opts.isFavorite ? 'Remove from' : 'Add to'} favorites">${opts.isFavorite ? '♥' : '♡'}</button>`
    : '';
  const quickViewBtn = opts.quickView
    ? `<button type="button" class="quick-view" data-id="${game.id}">QUICK VIEW</button>`
    : '';
  return `
    <a href="game.html?id=${encodeURIComponent(game.id)}" class="game-card">
      ${favBtn}
      ${quickViewBtn}
      <div class="thumb"><img src="${game.thumb}" alt="${game.title}" loading="lazy"></div>
      <div class="info">
        <p class="title">${game.title}</p>
        <div class="badges">
          <span class="genre">${game.genre}</span>
          <span class="license-badge">${game.license}</span>
        </div>
      </div>
    </a>
  `;
}
