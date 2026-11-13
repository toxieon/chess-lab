import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function sourceFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, acc);
    else if (/\.(ts|tsx|js|mjs|css)$/.test(name)) acc.push(path);
  }
  return acc;
}

test('Stockfish worker is vendored unmodified and not imported as a module', () => {
  const worker = readFileSync('public/vendor/stockfish/stockfish-18-lite-single.js', 'utf8');
  assert.match(worker, /Stockfish\.js 18/);
  assert.match(worker, /GPLv3/);
  assert.match(worker, /github\.com\/nmrugg\/stockfish\.js/);
  const copying = readFileSync('public/vendor/stockfish/Copying.txt', 'utf8');
  assert.match(copying, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(copying, /Version 3/);
  const wasm = readFileSync('public/vendor/stockfish/stockfish-18-lite-single.wasm');
  assert.ok(wasm.length > 1_000_000);

  for (const file of sourceFiles('src')) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /from ['"][^'"]*stockfish/);
    assert.doesNotMatch(text, /import ['"][^'"]*vendor\/stockfish/);
  }
});
