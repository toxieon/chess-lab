import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const required = [
  'dist/vendor/stockfish/stockfish-18-lite-single.js',
  'dist/vendor/stockfish/stockfish-18-lite-single.wasm',
  'dist/vendor/stockfish/Copying.txt',
];

for (const file of required) {
  if (!existsSync(file)) {
    console.error(`missing ${file}`);
    process.exit(1);
  }
}

const banner = readFileSync(required[0], 'utf8').slice(0, 400);
if (!banner.includes('Stockfish.js 18') || !banner.includes('GPLv3')) {
  console.error('Stockfish worker banner is missing');
  process.exit(1);
}

const assets = 'dist/assets';
if (existsSync(assets)) {
  for (const name of readdirSync(assets)) {
    if (!name.endsWith('.js')) continue;
    const file = join(assets, name);
    const text = readFileSync(file, 'utf8');
    if (text.includes('Stockfish.js 18')) {
      console.error(`Stockfish was bundled into ${name}`);
      process.exit(1);
    }
    // games.json is about 12 MB. It must be fetched, not bundled.
    if (text.length > 1_500_000) {
      console.error(`${name} is ${text.length} bytes; My Games JSON may have been bundled`);
      process.exit(1);
    }
  }
}

for (const file of [
  'dist/data/my-games/games.json',
  'dist/data/my-games/puzzles.json',
  'dist/data/my-games/patterns.json',
  'dist/data/my-games/openings.json',
  'dist/favicon.svg',
  'dist/favicon.ico',
  'dist/favicon-32x32.png',
  'dist/apple-touch-icon.png',
  'dist/icon-192.png',
  'dist/icon-512.png',
  'dist/manifest.webmanifest',
]) {
  if (!existsSync(file)) {
    console.error(`missing ${file}`);
    process.exit(1);
  }
}

console.log('dist stockfish files are standalone');
