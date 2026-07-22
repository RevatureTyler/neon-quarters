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
