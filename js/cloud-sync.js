// Cloud sync sits underneath the existing localStorage tracking in
// player.js/scores.js/leaderboards.js, it doesn't replace it. Every game
// still works with zero setup, same as before; when a visitor is signed
// in, these functions additionally push writes to Supabase and, once per
// login, pull their account's data back down into the same localStorage
// keys everything else already reads from. That means renderHighScores(),
// renderAchievements(), the favorite-heart button, etc. in the existing
// files needed zero changes -- they're still just reading localStorage,
// it's now occasionally filled in from the cloud instead of only ever
// growing from this one browser.
//
// Every function here fails silently (catches and swallows errors) on
// purpose: a flaky network request or a signed-out visitor should never
// break the local-only experience these features already had.

function nqCloudEnabled() {
  return SUPABASE_CONFIGURED && !!window.nqCurrentUser;
}

async function nqCloudRecordPlay(gameId) {
  if (!nqCloudEnabled()) return;
  try {
    await supabaseClient.from('plays').insert({ user_id: window.nqCurrentUser.id, game_id: gameId });
  } catch (e) {}
}

async function nqCloudRecordFavorite(gameId, isFavorite) {
  if (!nqCloudEnabled()) return;
  try {
    if (isFavorite) {
      await supabaseClient.from('favorites').upsert({ user_id: window.nqCurrentUser.id, game_id: gameId });
    } else {
      await supabaseClient.from('favorites').delete()
        .eq('user_id', window.nqCurrentUser.id).eq('game_id', gameId);
    }
  } catch (e) {}
}

async function nqCloudRecordRating(gameId, rating) {
  if (!nqCloudEnabled()) return;
  try {
    await supabaseClient.from('ratings').upsert({ user_id: window.nqCurrentUser.id, game_id: gameId, rating });
  } catch (e) {}
}

// Only called when recordScoreIfBetter() (scores.js) confirms this is a
// new personal best, so every row this writes is a real improvement. The
// `scores` table is append-only history, not a single mutable best, so
// this is always an insert, never an update.
async function nqCloudRecordScore(gameId, score) {
  if (!nqCloudEnabled()) return;
  try {
    await supabaseClient.from('scores').insert({ user_id: window.nqCurrentUser.id, game_id: gameId, score });
  } catch (e) {}
}

// Runs once right after sign-in. Strategy is deliberately simple: push
// whatever this browser already has locally up to the cloud first (so
// signing in never loses progress made before you had an account), then
// pull the now-merged totals back down into the same localStorage keys
// everything else reads from. Cloud is the source of truth after this
// point for as long as you stay signed in on this browser.
async function nqCloudSyncOnLogin() {
  if (!SUPABASE_CONFIGURED || !window.nqCurrentUser) return;
  const uid = window.nqCurrentUser.id;

  try {
    // --- push local-only progress up ---
    const localPlays = JSON.parse(localStorage.getItem('nq-plays') || '{}');
    const localFavorites = JSON.parse(localStorage.getItem('nq-favorites') || '[]');
    const localRatings = JSON.parse(localStorage.getItem('nq-ratings') || '{}');
    const localHighScores = JSON.parse(localStorage.getItem('nq-highscores') || '{}');

    const { data: cloudPlays } = await supabaseClient.from('plays').select('game_id').eq('user_id', uid);
    const cloudPlayCounts = {};
    (cloudPlays || []).forEach(r => { cloudPlayCounts[r.game_id] = (cloudPlayCounts[r.game_id] || 0) + 1; });
    for (const [gameId, count] of Object.entries(localPlays)) {
      const alreadySynced = cloudPlayCounts[gameId] || 0;
      const missing = Math.max(0, count - alreadySynced);
      for (let i = 0; i < missing; i++) {
        await supabaseClient.from('plays').insert({ user_id: uid, game_id: gameId });
      }
    }

    const { data: cloudFavorites } = await supabaseClient.from('favorites').select('game_id').eq('user_id', uid);
    const cloudFavoriteIds = new Set((cloudFavorites || []).map(r => r.game_id));
    for (const gameId of localFavorites) {
      if (!cloudFavoriteIds.has(gameId)) {
        await supabaseClient.from('favorites').upsert({ user_id: uid, game_id: gameId });
      }
    }

    const { data: cloudRatings } = await supabaseClient.from('ratings').select('game_id, rating').eq('user_id', uid);
    const cloudRatingMap = {};
    (cloudRatings || []).forEach(r => { cloudRatingMap[r.game_id] = r.rating; });
    for (const [gameId, rating] of Object.entries(localRatings)) {
      if (!(gameId in cloudRatingMap)) {
        await supabaseClient.from('ratings').upsert({ user_id: uid, game_id: gameId, rating });
      }
    }

    const { data: cloudScores } = await supabaseClient.from('scores').select('game_id, score').eq('user_id', uid);
    const cloudBestMap = {};
    (cloudScores || []).forEach(r => { cloudBestMap[r.game_id] = Math.max(cloudBestMap[r.game_id] || 0, r.score); });
    for (const [gameId, score] of Object.entries(localHighScores)) {
      if (score > (cloudBestMap[gameId] || 0)) {
        await supabaseClient.from('scores').insert({ user_id: uid, game_id: gameId, score });
      }
    }

    // --- pull merged totals back down ---
    const { data: mergedPlays } = await supabaseClient.from('plays').select('game_id').eq('user_id', uid);
    const mergedPlayCounts = {};
    (mergedPlays || []).forEach(r => { mergedPlayCounts[r.game_id] = (mergedPlayCounts[r.game_id] || 0) + 1; });
    localStorage.setItem('nq-plays', JSON.stringify(mergedPlayCounts));

    const { data: mergedFavorites } = await supabaseClient.from('favorites').select('game_id').eq('user_id', uid);
    localStorage.setItem('nq-favorites', JSON.stringify((mergedFavorites || []).map(r => r.game_id)));

    const { data: mergedRatings } = await supabaseClient.from('ratings').select('game_id, rating').eq('user_id', uid);
    const mergedRatingMap = {};
    (mergedRatings || []).forEach(r => { mergedRatingMap[r.game_id] = r.rating; });
    localStorage.setItem('nq-ratings', JSON.stringify(mergedRatingMap));

    const { data: mergedScores } = await supabaseClient.from('scores').select('game_id, score').eq('user_id', uid);
    const mergedBestMap = {};
    (mergedScores || []).forEach(r => { mergedBestMap[r.game_id] = Math.max(mergedBestMap[r.game_id] || 0, r.score); });
    localStorage.setItem('nq-highscores', JSON.stringify(mergedBestMap));
  } catch (e) {
    // A failed sync just means this session stays on whatever it had
    // locally -- never worth surfacing as a hard error to the player.
  }
}
