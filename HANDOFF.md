# Neon Quarters — Handoff

Static browser-game arcade site. Vanilla HTML/CSS/JS, no build step, no framework, no package manager.

- **Live site:** https://neonquarter.online
- **Repo:** `RevatureTyler/neon-quarters`, branch `main` (also the GitHub Pages source — pushing to `main` deploys directly, no CI build step)
- **Local dir:** `C:\Users\Dudei\Desktop\arcade-site\arcade-site\`
- **Local dev server:** `python -m http.server 9129 --directory arcade-site` (config lives in `.claude/launch.json`, port 9129)
- **AdSense publisher ID:** `pub-2636244885787785`

## Architecture

- 34 games in `games/games.json`, each an `id` pointing at either an embedded HTML5 game (`games/files/<id>/index.html`, loaded in a same-origin iframe) or a Flash `.swf` (played via Ruffle). 12 genres now, including two added this session: Platformer and Tower Defense.
- `js/player.js` is the core game-loading logic: builds the iframe, wires touch controls, and — the trickiest part — `setupResponsiveIframe()` auto-scales each game's fixed-size legacy page to fill the player frame via a measured `transform: scale()`. Games with their own responsive resize logic are excluded via `SELF_SIZING_GAMES` (currently `classic-pool`, `astray`, `bullet-hell`, `lights-out`, `genius`, `googol`, `jokenpo`, `bangbang`, `isocity`, `spinhook`, `tower-defense` — these all size themselves off `window.innerWidth`/`innerHeight` or a `100vh`-flex container at load, or (spinhook) actively via Phaser's own `Scale.RESIZE` mode, rather than using a fixed canvas). **Gotcha specific to that group:** several of them don't set an explicit page background color, relying on the browser's default white canvas. That default renders as transparent inside our black `.player-frame`, making black-on-white UI (checkboxes, line-art icons) go black-on-black and disappear. If a self-sizing game you're adding looks blank or half-invisible once embedded, check this first — fix is one `background: #fff` in its CSS, not a scaling issue. (`tower-defense` already sets its own background explicitly, so it didn't need that particular fix, just the `SELF_SIZING_GAMES` entry.)
- `js/games-data.js` has the shared `renderGameCard()` used across `site.js`/`player.js`/`leaderboards.js`.
- `js/leaderboards.js`, `js/achievements.js` — localStorage-first: play counts, high scores, ratings, favorites, 10 achievement badges, all work with zero setup. Optionally backed by Supabase now too (see "Accounts + global leaderboards" below) — `js/cloud-sync.js` mirrors writes to the cloud when signed in, but every one of these files still just reads/writes the same localStorage keys it always did, so none of them needed a rewrite.
- `js/cookie-consent.js` — gates ad loading on consent; queues callbacks so ads load immediately on first accept (no refresh needed).
- All licensing is tracked per-game in `games.json` (`license`, `source`, `credit` fields) and surfaced on `licenses.html` and each game page. **Important:** always check the actual source file's header comment for the license, not just the repo's root `LICENSE` file — they can disagree (a Bubble Shooter candidate was dropped in an earlier session after its `.js` file's own header said GPL-3.0 while the repo root said MIT; this session, a mahjong solitaire's game code was MIT but its tile art traced back to a GPL-2.0 source, same lesson).

## Accounts + global leaderboards (built, not yet configured)

- Backend is Supabase (Postgres + built-in auth), talked to directly from the client — no server of ours in between, so this stays a static site. Schema + RLS policies: `supabase/schema.sql`. Full setup walkthrough: `supabase/README.md`.
- `js/supabase-config.js` holds `SUPABASE_URL`/`SUPABASE_ANON_KEY` placeholders and the `SUPABASE_CONFIGURED` flag everything else checks, same pattern as `ADSENSE_CLIENT` in `js/ads.js`. **Currently unconfigured** — every account/leaderboard feature is built but switched off until someone actually creates a Supabase project (manual step, needs a human: email signup, can't be automated from here) and fills in those two values.
- `account.html` is the sign-up/sign-in/profile page. `js/account-widget.js` injects a small "SIGN IN" / "@username" link into every page's header next to the theme toggle.
- `js/cloud-sync.js` is the only thing that talks to Supabase for game data; it hooks into the exact same write points `player.js`/`scores.js` already had for localStorage, so nothing else needed to change. On sign-in it push-then-pulls to merge local and cloud data.
- Tested against the real "not configured" state (current default) — verified clean, no console errors anywhere, correct hidden/fallback states. **Not tested against a live Supabase project** — no such project exists yet to test against. If something's actually broken in the Supabase integration itself (as opposed to the fallback path), it'll surface the first time someone runs through `supabase/README.md`'s step 5 verification checklist.

## AdSense / GA4 reporting pipeline (working, deployed)

- `daily-revenue-report.js` + `.github/workflows/daily-report.yml` — cron `0 13 * * *`, pulls AdSense (OAuth2 Client ID/Secret/refresh token, `adsense.readonly` scope only) + GA4 (service account) data, emails a report (email is optional — falls back to console/log output if `EMAIL_USER`/`EMAIL_APP_PASSWORD` secrets aren't set).
- AdSense auth is OAuth (not a service account) because AdSense invites can't be "accepted" by a non-human account.
- **Gotcha:** while the OAuth consent screen is in "Testing" status, refresh tokens expire after 7 days. The screen has since been published, which removes that limit — if `invalid_grant` errors reappear, check consent-screen publish status first.

## AdSense review status (as of last check, 2026-08-13)

Was rejected once for "Low value content." Addressed via:
- Expanded every game's `description` + new `tips` field in `games.json` (~350 words/page average, up from ~87)
- Fixed `robots.txt`/`sitemap.xml`, which were pointing at a placeholder domain
- Added missing `ads.txt`
- Expanded `about.html`, added 2 blog posts

All verified live and healthy as of last check (ads.txt, robots.txt, 36-url sitemap, 200 OK, HTTPS cert approved through Oct 2026). **User has not yet confirmed clicking "Request review" in AdSense** — that's a manual step on their end, last seen sitting at the unchecked "I confirm I have fixed the issues" checkbox.

## Most recent work (this session, 2026-08-15)

Four more commits on top of the 2026-08-13 session below, still **not pushed** (local commits `e5fb49d`, `ff9d7b6`, `5c0a24e`, `9ced71d`):

**2 more games (`e5fb49d`):** Color Lines (Arnis Ritins — also our 15 Puzzle author) and SpinHook (Sepand Haghighi — also our Lights Out author). This round had an unusually high rejection rate — see that commit's message for the full list (a basketball game with an actual uncredited NBA press photo as a sprite was the most alarming one). SpinHook needed a `SELF_SIZING_GAMES` entry (Phaser's own `Scale.RESIZE` mode).

**Accounts + global leaderboards (`ff9d7b6`):** Built on Supabase, fully wired but switched off (`SUPABASE_CONFIGURED` is false — placeholder credentials in `js/supabase-config.js`). See the "Accounts + global leaderboards" section above for what's there; see `supabase/README.md` for what a human still needs to do to turn it on (create the Supabase project — this genuinely cannot be automated, it needs an email signup — then run the schema and paste in two config values). Tested thoroughly against the real "not configured" state; **not tested against a live backend**, since none exists yet.

**3 more games, 2 new genres (`5c0a24e`, `9ced71d`):** Tiny Platformer + Tower Platformer (both Jake Gordon, also our JS Racer/Pong author) and Tower Defense (Amelia Clarke). First real Platformer-genre entries, and a genuinely new Tower Defense genre. Tower Defense needed 3 of 7 sound effects swapped out for a confirmed-safe one (unclear licensing on the originals, full story in that commit) and a `SELF_SIZING_GAMES` entry. Tower Platformer's first integration pass only copied `images/` and `index.html` and missed `js/common.js`, `js/tower.js`, `js/fpsmeter.min.js`, and `levels/demo.json` entirely — caught immediately from console 404s before it ever reached `games.json`, but a good reminder to check a repo's *full* file tree (`find . -type f`), not just the folder that looks most relevant, before deciding what to copy.

**Unrelated but important finding this session: the C: drive is nearly full.** `df -h` on the Temp mount showed as little as 2.3MB free out of 223GB at one point mid-session (it fluctuated up to 24GB free later — normal temp churn, not a leak, but still worth knowing the floor is that close). This has nothing to do with this project — a folder-size scan found `C:\Users` alone at ~147GB — but it's worth the user's attention regardless: Windows can behave badly (failed updates, app crashes) when free space gets this low. Not something to fix from within this repo.

**Not yet done, needs a human:** nothing from either session (`ced3229` through `9ced71d`, 8 commits total) has been pushed to `main` yet. Given `main` is also the live GitHub Pages source with no build/review step in between, push was deliberately held back both times for the user to review first.

## Previous session (2026-08-13)

**UI declutter (`ced3229`):** The homepage had two genre filters stacked on top of each other doing the identical job — colorful icon chips (`#genreRow`) and a plain-text `filter-bar` row a few lines below. Removed the duplicate `filter-bar` entirely (both the markup and its `renderFilters()` JS); the icon chips are now the sole genre control and show a live per-genre count. Also: `renderMoreGames()` in `player.js` used to just take the first 4 games in file order excluding the current one — now it prefers same-genre games first, backfilling from the rest of the catalog only if a genre is thin, and the "MORE GAMES" label updates to name the genre when that applies. The homepage featured-game slot was hardcoded to `GAMES[0]` forever — now rotates deterministically by calendar day (`Math.floor(Date.now()/86400000) % GAMES.length`). Added a small staggered fade-in on grid card render for polish.

**6 new games (`ed80d1a`):** InvaderZ, Genius, Googol, JoKenPo, BangBang, IsoCity — all MIT, all from victorqribeiro (Victor Ribeiro) on GitHub, sourced via `gh search repos` + manual license-header verification, same standard as every prior batch. Full writeup of what shipped and what got rejected (a car game using a real photographed Mercedes-Maybach, an unfinished tower-defense WIP, a shooter with an uncredited sound file, a puzzle too similar to 15 Puzzle already in the catalog, a solitaire needing a React build step) is in the blog post `six-new-games-and-a-few-that-didnt-make-it`. Two integration gotchas worth remembering, both now noted in the Architecture section above: (1) `SELF_SIZING_GAMES` needed 5 new entries, and (2) all 5 needed an explicit white background added to their CSS or they render invisibly (black-on-black) once embedded. Also hit a genuinely unusual one: `js/aux.js` is a filename this author reuses across several of his repos, and `aux` is a reserved device name on Windows (`AUX`, `CON`, `PRN`, `NUL`, `COM1-9`, `LPT1-9`) — `git clone` silently fails to check out any file with that exact basename on a Windows working tree (the whole checkout aborts, every file shows as "deleted" in `git status`). Worked around by fetching via `curl <tarball-url> | tar --transform 's/aux\.js/auxfns.js/'` instead of `git clone`, and either renamed the reference in `index.html` or (in most cases) just dropped the script tag entirely since `aux.js` in this author's repos turned out to be dead PWA-install/service-worker boilerplate irrelevant inside our iframe anyway.

**2 blog posts (`94be72f`):** One covering the games batch, one covering the UI declutter. Both dated AUG 13, 2026.

## Earlier session's scaling-bug fix (for context, already shipped)

`setupResponsiveIframe()` in `js/player.js` had legacy games rendering with oversized black bars on wide viewports, caused by redundant in-page chrome (e.g. Lunar Lander's own `<h1>`, 15 Puzzle's credit paragraph) inflating the measured aspect ratio. Fixed in `games/files/lunar-lander/index.html` and `games/files/fifteen-puzzle/index.html`. Not yet individually re-checked against this exact pattern: `2048`, `connect-four`, `snake`, `reaction-time`, `typing-test`, `word-search`, `0hh1`, `hangman`, `memory-match` — these measured fine in the original audit but weren't specifically checked for it.

## Environment quirks worth knowing

- The in-browser screenshot tool (`computer{action:"screenshot"}`) was unreliable in an earlier session ("Browser pane is not displayed, so the page is not compositing frames"). This session used the Playwright MCP tools instead, which worked reliably — `browser_navigate` + `browser_take_screenshot`/`browser_evaluate` was the main loop. Screenshot files save relative to wherever Playwright's own process cwd is, not this session's; pass an absolute path (the scratchpad dir works) to `filename` to control where they land.
- Browser caching required bumping the dev server's port repeatedly across both sessions (9129 → 9131 → 9142 → 9143 → 9144 → 9145 → 9150 → 9151 → 9152) — editing a JS/CSS file that's already been fetched once doesn't reliably bust the browser's cache on the same port, even against `python -m http.server`, which sends no cache-control headers of its own. Restarting on a fresh port is the reliable fix; killing the old one first (`pkill -f "http.server <port>"`) avoids leaking background processes. Reverted back to port 9129 (matching `.claude/launch.json`) before ending each session.
- Static game files under `games/files/` are served directly with no caching issues observed.
- Fetching a GitHub repo via `git clone` can silently fail to check out files with Windows-reserved basenames (`AUX`, `CON`, `PRN`, `NUL`, `COM1-9`, `LPT1-9` — case-insensitive, regardless of extension, so `aux.js` counts). Workaround: `curl -sL <tarball-url> | tar --transform 's/aux\.js/renamed.js/' -xzf -` instead of cloning, then fix up any reference to the renamed file.
