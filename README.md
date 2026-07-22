# Neon Quarters: Setup Guide

## What's built
A static site ready to deploy, on the "Neon Quarters" design system:
- `index.html`: homepage with hero and featured game, genre chips, search/sort, favorites
  section, most played leaderboard, quick view modal, newsletter signup (fake, no backend)
- `game.html`: game player (Ruffle for SWF, iframe for HTML5), favorite toggle, 5 star
  rating, share links (X/Reddit/copy link), creator bio, comments, more games grid
- `about.html`: about and contact (mailto)
- `submit.html`: game submission form (opens a pre filled mailto, no backend)
- `blog.html`, `blog-post.html`: blog with two real launch posts
- `404.html`: not found page
- `privacy.html`, `licenses.html`, `terms.html`: required for AdSense approval and legal cover
- `js/theme-init.js` plus `js/theme.js`: light/dark theme toggle (persisted, no flash)
- `js/cookie-consent.js`: accept/decline cookie banner, gates the ad script below
- `js/ads.js`: AdSense integration, off until you configure it (see "Turning ads on")
- `js/scores.js`: real per game high score tracking for the games it supports
- `leaderboards.html` plus `js/leaderboards.js`: your personal high scores, most
  played, top rated, and favorites, all in one page
- `games/games.json`: your game catalog. Adding a game means adding one JSON entry, no code changes.
- `games/files/`: 21 real, working HTML5 games already sourced and verified (see below).
- `games/thumbs/`: real screenshots captured from each game, not placeholders.
- `js/ruffle/`: self hosted Ruffle (Flash emulator) build, already installed.
- `robots.txt`, `sitemap.xml`, `favicon.svg`: basic SEO and branding housekeeping, done.

## Community features (all client side, no backend)
Favorites, 5 star ratings, comments, high scores, and the leaderboards page are
all stored in the visitor's own browser via `localStorage`. Nothing is sent to
a server, so none of it is shared between visitors: your high score, your
favorites, and your ratings are just yours, tracked in your own browser and
gone if you clear its data. This keeps the site fully static and free to host.
If you want any of this shared across visitors (a real global leaderboard, for
example), that requires a real backend. A Supabase or Firebase backed rebuild
is the natural next step, but it's a separate project from this static site.

### How high scores work
`js/scores.js` reads each game's score straight out of its iframe, since every
game here is served from the same origin as the site (just a different path),
so there's no cross origin restriction stopping us. This only works for games
we've actually checked and added a reader for, currently 2048 (reads its
`.score-container` element) and Asteroids (reads `window.Game.score`). Other
games either don't track a numeric score at all (Astray, Classic Pool) or
don't expose one in an easily readable way, so they just won't show a "Your
best score" block on their play page. To add another, look at how that game
stores its score (view source, or its GitHub repo) and add an entry to
`SCORE_READERS` in `js/scores.js`.

## Current catalog (21 games, all MIT/Unlicense, license verified via GitHub API)
2048, Canvas Tetris, 0h h1, JS Racer, Astray, Asteroids, Star Battle, Classic Pool,
Bullet Hell, Emoji Minesweeper, Fruit Matcher, Connect Four, Checkers, Hangman,
Word Find, Reaction Time Tester, Lights Out, 15 Puzzle, Snake, Lunar Lander, and
Typing Speed Test, spanning Puzzle, Racing, Adventure, Arcade, Shooter, Sports,
Board, Word, and Skill. Each was downloaded from its original GitHub repo,
extracted as is (unmodified except the fixes noted below), and play tested end
to end.

Bugs fixed during integration (pre existing issues in the upstream game code,
not something we broke):
- `games/files/astray/index.html`: textures were requested from absolute paths
  (`/ball.png`) which 404 once nested under `games/files/astray/`, so these were
  changed to relative paths.
- `games/files/html5-asteroids/index.html`: the game draws in the canvas's
  default black fill color, which is invisible against our dark theme, so the
  canvas was given an explicit white background.

Asset swaps made for rights reasons, not bugs (the code stayed MIT licensed
either way, but these specific assets weren't clearly ours to use):
- `games/files/checkers/`: the king/queen piece used a "Trollface" meme image
  of disputed authorship. Removed and replaced with a plain crown character.
- `games/files/minesweeper/`: defaulted to loading emoji images from Twitter's
  Twemoji CDN. Switched the default to native emoji characters instead, which
  also removes an external network dependency from an embedded game.
- `games/files/word-search/`: shipped with a placeholder secret word and a
  French word list left over from whoever last customized it. Swapped in
  arcade themed English words.

Two games were sourced but **rejected** after review, not just approved on a
license technicality:
- A Pac-Man clone (`mumuy/pacman`): its own splash screen displays "Pac-Man"
  branding regardless of what we'd title the listing, and the game is embedded
  in the author's personal portfolio site (unrelated blog and photography
  pages), not a standalone package.
- A memory matching game (`taniarascia/memory`): its code was MIT licensed,
  but the card images were ripped Super Mario character sprites (Mario, Luigi,
  Goomba, and so on), Nintendo's IP, not covered by that license at all.
  Replaced with `mmenavas/memory-game`, which uses plain fruit photography.
- A rhythm game (`ChloeLiang/rhythm-game`) was considered but never even
  downloaded: its README states the backing track is "Kataware Doki" from the
  anime *Your Name*, composed by Yojiro Noda, a real commercial song with no
  license covering our use of it.

## Steps to launch (in order)

### 1. Get Ruffle: done
Self hosted Ruffle v0.4.1 is already installed at `js/ruffle/ruffle.js`
(downloaded from the official github.com/ruffle-rs/ruffle release). It loads
on demand only when a `swf` type game is played. The current 21 games are all
HTML5 and don't trigger it, but it's ready for whenever you add a Flash game.

### 2. Source more games (optional, to grow past 21)
Pull only games explicitly marked CC0, MIT, or another open license. Best places:
- itch.io: filter by license tag where creators disclose it
- OpenGameArt.org: has some full HTML5 games, all license tagged
- GitHub: search by topic (for example `html5-game`) filtered by `license:mit`,
  and verify via the GitHub API (`api.github.com/repos/OWNER/REPO`) rather than
  trusting blog posts. Check for games that don't need a build step where possible.

For each one: download the file, note the exact license and creator name, and
drop it in `games/files/`.

### 3. Fill in games.json
Add new entries following the existing pattern. Each needs: id, title, added,
type (swf or html5), path, thumb, genre, tags, license, source, credit,
creatorBio, description, and howToPlay. The last three are what keep game
pages from looking like bare embeds, write them yourself in your own words
rather than copying the repo's README verbatim.

### 4. Get a domain and hosting
- Domain: about $10 to $12 a year (Namecheap, Porkbun)
- Hosting: Cloudflare Pages or GitHub Pages, both free for a static site like this
- Point your domain at the host using their DNS instructions

### 5. Before applying for AdSense
- privacy.html's date and contact placeholders are already filled in
  (tharbykc892@gmail.com). Update the email there and in about.html/submit.html
  if you want a different address.
- Replace the placeholder domain in `robots.txt` and `sitemap.xml`
  (`neonquarters.example`) with your real one once you've bought it.
- The site needs to be live with real content before applying; Google checks
  for "sufficient content" and thin sites get rejected. 21 games, each with
  its own description and how-to-play, comfortably clears that bar, but keep
  adding a few more over time regardless (see step 6).
- After launch, submit `sitemap.xml` to Google Search Console (requires your
  own Google account to verify domain ownership).

### Turning ads on
The ad system is already built and wired into every ad slot on index.html and
game.html, it's just switched off until you have a real AdSense account:
1. Apply for AdSense once your site is live, using your real domain.
2. Once approved, open `js/ads.js` and replace `ADSENSE_CLIENT` with your real
   publisher ID (`ca-pub-...`, from your AdSense dashboard).
3. In your AdSense dashboard, create an ad unit for each of the four slots
   (leaderboard, in feed, above game, below game) and replace the matching
   `data-ad-slot="..."` placeholder value on each `.ad-slot` div in index.html
   and game.html with the real slot ID AdSense gives you.
That's it. Once `ADSENSE_CLIENT` no longer contains "XXXX", `js/ads.js` starts
loading real ads automatically, respecting the cookie consent banner and lazy
loading anything below the fold so you're not paying for ad requests nobody
scrolls to.

### 6. Ongoing (minimal, since you want mostly passive)
- Add a new game every so often to keep content growing (helps SEO and AdSense)
- Check licenses.html stays accurate. This is your legal paper trail if anyone asks.

## Notes
- Every game's play page shows its license, credit, and source link. This is
  intentional. It's your defense if a creator ever objects, and it's honest
  to players.
- No login or accounts, no user data collection beyond what AdSense itself
  does, which keeps the privacy policy simple.
