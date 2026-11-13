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
    const text = readFileSync(join(assets, name), 'utf8');
    if (text.includes('Stockfish.js 18')) {
      console.error(`Stockfish was bundled into ${name}`);
      process.exit(1);
    }
  }
}

console.log('dist stockfish files are standalone');
