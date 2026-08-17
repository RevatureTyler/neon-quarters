// Bare-bones player for third-party embeds (see embed.html). Deliberately
// does not reuse player.js's loadGame(): that function assumes the full
// game.html DOM (favorite button, comments, high scores, etc.) and would
// throw on this much simpler page. This only needs to get the right iframe
// or Ruffle player on screen, full-bleed, with a small credit link back to
// the main site for attribution and referral traffic.
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function loadEmbedGame() {
  const id = getParam('id');
  const game = GAMES.find((g) => g.id === id);
  const host = document.getElementById('embedFrame');

  if (!game) {
    const p = document.createElement('p');
    p.id = 'embedError';
    p.textContent = 'Game not found. ';
    const a = document.createElement('a');
    a.href = 'https://neonquarter.online';
    a.style.color = '#5ee6d9';
    a.textContent = 'Browse all games';
    p.appendChild(a);
    host.appendChild(p);
    return;
  }

  const credit = document.createElement('a');
  credit.id = 'embedCredit';
  credit.href = `https://neonquarter.online/game.html?id=${encodeURIComponent(game.id)}`;
  credit.target = '_blank';
  credit.rel = 'noopener';
  credit.textContent = '▶ More free games at Neon Quarters';
  host.appendChild(credit);

  if (game.type === 'swf') {
    const s = document.createElement('script');
    s.src = 'js/ruffle/ruffle.js';
    s.onload = () => {
      const ruffleApi = window.RufflePlayer && window.RufflePlayer.newest();
      if (!ruffleApi) return;
      const player = ruffleApi.createPlayer();
      player.style.position = 'absolute';
      player.style.inset = '0';
      player.style.width = '100%';
      player.style.height = '100%';
      host.appendChild(player);
      player.load(game.path);
    };
    document.head.appendChild(s);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = game.path;
    iframe.setAttribute('allowfullscreen', 'true');
    host.appendChild(iframe);
  }
}

window.gamesReady.then(loadEmbedGame);
