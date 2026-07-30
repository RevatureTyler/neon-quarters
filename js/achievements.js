// Achievements computed entirely from data already tracked elsewhere (plays,
// favorites, ratings, high scores) -- no new tracking hooks needed in any
// individual game. Recomputed fresh on every visit to leaderboards.html.

const ACHIEVEMENTS = [
  {
    id: 'first-quarter',
    title: 'First Quarter',
    desc: 'Play your first game.',
    icon: '🪙',
    check: (d) => d.totalPlays >= 1,
  },
  {
    id: 'regular',
    title: 'Regular',
    desc: 'Play 5 different games.',
    icon: '🎮',
    check: (d) => d.gamesPlayed >= 5,
  },
  {
    id: 'arcade-legend',
    title: 'Arcade Legend',
    desc: 'Play 10 different games.',
    icon: '🏆',
    check: (d) => d.gamesPlayed >= 10,
  },
  {
    id: 'completionist',
    title: 'Completionist',
    desc: 'Play every game in the arcade.',
    icon: '👑',
    check: (d) => d.gamesPlayed >= d.totalGames,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    desc: 'Play the same game 5 times.',
    icon: '🔁',
    check: (d) => d.maxPlaysOnOneGame >= 5,
  },
  {
    id: 'curator',
    title: 'Curator',
    desc: 'Favorite 3 games.',
    icon: '♥',
    check: (d) => d.favoritesCount >= 3,
  },
  {
    id: 'critic',
    title: 'Critic',
    desc: 'Rate 3 games.',
    icon: '📝',
    check: (d) => d.ratingsCount >= 3,
  },
  {
    id: 'five-star',
    title: 'Five Star',
    desc: 'Give any game a 5 star rating.',
    icon: '⭐',
    check: (d) => d.hasFiveStarRating,
  },
  {
    id: 'high-scorer',
    title: 'High Scorer',
    desc: 'Set a high score in any tracked game.',
    icon: '📈',
    check: (d) => d.highScoreCount >= 1,
  },
  {
    id: 'genre-hopper',
    title: 'Genre Hopper',
    desc: 'Play games from 4 different genres.',
    icon: '🌀',
    check: (d) => d.genresPlayed >= 4,
  },
];

function computeAchievementData() {
  let plays = {};
  let favorites = [];
  let ratings = {};
  let highScores = {};
  try { plays = JSON.parse(localStorage.getItem('nq-plays') || '{}'); } catch (e) {}
  try { favorites = JSON.parse(localStorage.getItem('nq-favorites') || '[]'); } catch (e) {}
  try { ratings = JSON.parse(localStorage.getItem('nq-ratings') || '{}'); } catch (e) {}
  try { highScores = JSON.parse(localStorage.getItem('nq-highscores') || '{}'); } catch (e) {}

  const playedIds = Object.keys(plays).filter((id) => plays[id] > 0);
  const genres = new Set(
    playedIds
      .map((id) => (GAMES.find((g) => g.id === id) || {}).genre)
      .filter(Boolean)
  );

  return {
    totalPlays: playedIds.reduce((sum, id) => sum + plays[id], 0),
    gamesPlayed: playedIds.length,
    totalGames: GAMES.length,
    maxPlaysOnOneGame: playedIds.reduce((max, id) => Math.max(max, plays[id]), 0),
    favoritesCount: favorites.length,
    ratingsCount: Object.keys(ratings).length,
    hasFiveStarRating: Object.values(ratings).some((r) => r >= 5),
    highScoreCount: Object.keys(highScores).length,
    genresPlayed: genres.size,
  };
}

function renderAchievements() {
  const grid = document.getElementById('achievementsGrid');
  const countEl = document.getElementById('achievementsCount');
  if (!grid) return;

  const data = computeAchievementData();
  const unlocked = ACHIEVEMENTS.filter((a) => a.check(data));

  if (countEl) countEl.textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`;

  grid.innerHTML = ACHIEVEMENTS.map((a) => {
    const isUnlocked = a.check(data);
    return `
      <div class="achievement-badge${isUnlocked ? ' unlocked' : ''}" title="${a.desc}">
        <span class="achievement-icon">${a.icon}</span>
        <p class="achievement-title">${a.title}</p>
        <p class="achievement-desc">${a.desc}</p>
      </div>
    `;
  }).join('');
}

window.gamesReady.then(renderAchievements);
