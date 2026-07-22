// Real personal high score tracking for games whose score we can actually
// read. Since every game here is served from the same origin as this site
// (just a different path), the played iframe isn't cross-origin, so we can
// reach into its document or window to read the score it's already keeping.
// This only works for games we've checked and added a reader for below; any
// other game just won't show a "Your best score" block on its play page.
//
// Scores are personal to this browser only (same as favorites, ratings, and
// comments), stored in localStorage under SCORE_KEY. There's no way to see
// how you rank against anyone else without a real backend.
const SCORE_KEY = 'nq-highscores';

const SCORE_READERS = {
  '2048': (win, doc) => {
    const el = doc.querySelector('.score-container');
    if (!el) return null;
    const n = parseInt(el.textContent, 10);
    return Number.isFinite(n) ? n : null;
  },
  'html5-asteroids': (win) => {
    return win.Game && typeof win.Game.score === 'number' ? win.Game.score : null;
  }
};

function getHighScores() {
  try { return JSON.parse(localStorage.getItem(SCORE_KEY) || '{}'); }
  catch (e) { return {}; }
}

function getHighScore(gameId) {
  return getHighScores()[gameId] || 0;
}

function recordScoreIfBetter(gameId, score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return getHighScore(gameId);
  const scores = getHighScores();
  if (score > (scores[gameId] || 0)) {
    scores[gameId] = score;
    localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
  }
  return scores[gameId] || 0;
}

// Polls the iframe every couple of seconds for a fresh score reading. Games
// are simple enough here that polling is far less code than wiring up a
// postMessage protocol each one would need to opt into individually.
function startScoreTracking(gameId, iframe, onUpdate) {
  const reader = SCORE_READERS[gameId];
  if (!reader || !iframe) return null;

  const poll = () => {
    let win, doc;
    try {
      win = iframe.contentWindow;
      doc = iframe.contentDocument;
    } catch (e) {
      return; // would only happen if a future game were cross-origin
    }
    if (!win || !doc) return;
    const current = reader(win, doc);
    if (current === null) return;
    const best = recordScoreIfBetter(gameId, current);
    if (onUpdate) onUpdate(best);
  };

  const intervalId = setInterval(poll, 2000);
  iframe.addEventListener('load', poll);
  return intervalId;
}
