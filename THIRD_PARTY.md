# Third-party licences

Chess Lab itself is AGPL-3.0-only. See LICENSE and NOTICE.

## Runtime dependencies (permissive)

| Package | Version | Licence |
| --- | --- | --- |
| [react](https://github.com/facebook/react) | 18.3.x | MIT |
| [react-dom](https://github.com/facebook/react) | 18.3.x | MIT |
| [chess.js](https://github.com/jhlywa/chess.js) | 1.2.x | BSD-2-Clause |
| [react-chessboard](https://github.com/Clariity/react-chessboard) | 4.7.x | MIT |

## Build tools

| Package | Licence |
| --- | --- |
| [vite](https://github.com/vitejs/vite) | MIT |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | MIT |
| [typescript](https://github.com/microsoft/TypeScript) | Apache-2.0 |
| [@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped), @types/react-dom | MIT |

## Adapted code

[Chesskit](https://github.com/GuillaumeSD/Chesskit) by GuillaumeSD and contributors, AGPL-3.0. Files adapted from it are listed in NOTICE. No other Chesskit source is included.

## Stockfish (GPL-3.0, separate worker)

Unmodified files under `public/vendor/stockfish/`:

- `stockfish-18-lite-single.js`
- `stockfish-18-lite-single.wasm`
- `Copying.txt` (GNU GPL version 3)

These come from [stockfish.js](https://github.com/nmrugg/stockfish.js) 18.0.8 (Copyright Chess.com, LLC, GPL-3.0), which wraps [Stockfish](https://github.com/official-stockfish/Stockfish) by T. Romstad, M. Costalba, J. Kiiski, G. Linscott, and contributors (GPL-3.0). The network is by Linmiao Xu (linrock).

The worker is not linked or bundled into Chess Lab's scripts. The page loads it with `new Worker(...)`. The app footer links to the Stockfish and stockfish.js source.
