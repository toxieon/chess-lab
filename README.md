# Chess Lab

Personal rating chart and game review for the Chess.com account `brandonneillthegreat`.

The site is a static Vite + React app. It reads the public Chess.com API in the browser, caches finished months locally, and reviews games with single-threaded Stockfish. There is no backend and no coach bot.

## Run locally

```bash
npm install
npm test
npm run dev
```

`npm run build` writes `dist/`. `npm run preview` serves that folder. Paths are relative, so the same build works under GitHub Pages at `/chess-lab/`.

## GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`, which builds the site and deploys with GitHub Actions. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. `dist/` is not committed. The workflow has no path filter, so a push that only changes `public/data/**` still deploys.

## My Games

The My Games section replays a precomputed export: a game viewer with an eval graph, puzzles, repeat offences, and openings. The browser fetches `public/data/my-games/*.json` when that view is opened. `games.json` is requested only for the game list and the game viewer. Evaluations are the stored Stockfish scores. The site does not recompute them and does not import the JSON into the bundle. Field definitions are in `public/data/my-games/SCHEMA.md`.

## Data refresh

A nightly job overwrites these four files on `main`:

- `public/data/my-games/games.json`
- `public/data/my-games/puzzles.json`
- `public/data/my-games/patterns.json`
- `public/data/my-games/openings.json`

Leave the rest of the tree alone. Pages builds on that push and redeploys. Each file is fetched with `cache: 'no-cache'`, and the page shows that file's `generated_melbourne` timestamp as "Updated …".

## Data

Games come only from `https://api.chess.com/pub/player/brandonneillthegreat`. Archive months are requested one at a time. Months before the current one are stored in IndexedDB and not requested again. The current month is loaded on each visit and polled about every five minutes. A 429 response waits and retries.

## Review

Open a game, then Analyse. Stockfish 18 Lite runs at a configurable depth (default 12) in one Web Worker. Your moves are marked from centipawn loss: best 0–10, good under 50, inaccuracy 50–99, mistake 100–299, blunder 300+. Inaccuracies and worse draw the best-move arrow. Finished reviews are cached per game and depth.

Arrow keys step through the game. Home and End jump to the start and the end.

## Licence

Chess Lab is free software under the **GNU Affero General Public License v3.0 only**. The source for the running site is [github.com/toxieon/chess-lab](https://github.com/toxieon/chess-lab).

Some engine-session and evaluation-bar code is adapted from [Chesskit](https://github.com/GuillaumeSD/Chesskit) (AGPL-3.0). See NOTICE.

Stockfish and stockfish.js are **GPL-3.0**. Their files stay unmodified in `public/vendor/stockfish/` and are loaded only as a Worker. See THIRD_PARTY.md for the full list.
