import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { clipEval, formatEval, formatUpdated } from '../src/mygames/format.mjs';
import { playSanLine, sanTokens } from '../src/mygames/line.mjs';
import {
  parseGamesDocument,
  parseOpeningsDocument,
  parsePatternsDocument,
  parsePuzzlesDocument,
  sortPatterns,
} from '../src/mygames/parse.mjs';
import { gameHash, parseRoute, puzzleHash } from '../src/mygames/route.mjs';

const root = new URL('../public/data/my-games/', import.meta.url);

function read(name) {
  return JSON.parse(readFileSync(new URL(name, root), 'utf8'));
}

test('formatters show stored scores and the Melbourne timestamp', () => {
  assert.equal(formatEval({ cp: 80 }), '+0.80');
  assert.equal(formatEval({ cp: -150 }), '-1.50');
  assert.equal(formatEval({ cp: 0 }), '0.00');
  assert.equal(formatEval({ mate: 3 }), 'Mate in 3');
  assert.equal(formatEval({ mate: -2 }), 'Mated in 2');
  assert.equal(formatEval({ mate: 0, winner: 'white' }), 'Checkmate');
  assert.equal(clipEval(9992), 1500);
  assert.equal(clipEval(-10000), -1500);
  assert.equal(clipEval(40), 40);
  const updated = formatUpdated('2026-11-16T10:33:09+11:00');
  assert.match(updated, /^Updated /);
  assert.match(updated, /10:33/);
  assert.match(updated, /2026/);
});

test('hash routes round-trip and leave the rating links alone', () => {
  assert.equal(parseRoute('').page, 'lab');
  assert.equal(parseRoute('#rating').page, 'lab');
  assert.equal(parseRoute('#g=184654778172').page, 'lab');
  assert.deepEqual(parseRoute('#mygames'), { page: 'games' });
  assert.deepEqual(parseRoute('#puzzles'), { page: 'puzzles' });
  assert.deepEqual(parseRoute('#patterns'), { page: 'patterns' });
  assert.deepEqual(parseRoute('#openings'), { page: 'openings' });
  assert.deepEqual(parseRoute(puzzleHash('p-184654778172-58')), {
    page: 'puzzle',
    id: 'p-184654778172-58',
  });
  assert.deepEqual(parseRoute(gameHash('184654778172', 58)), {
    page: 'game',
    id: '184654778172',
    ply: 58,
  });
  assert.equal(parseRoute(gameHash('184654778172', 0)).ply, 0);
  assert.equal(parseRoute('#game=12&ply=nope').ply, 0);
});

test('parsers reject malformed documents and keep eval objects intact', () => {
  assert.throws(() => parseGamesDocument(null), /games\.json/);
  assert.throws(() => parseGamesDocument({ generated_melbourne: 'x' }), /games/);
  assert.throws(() => parsePuzzlesDocument({ generated_melbourne: 'x', puzzles: [{ id: 'p' }] }), /puzzles\.json/);
  assert.throws(
    () =>
      parsePuzzlesDocument({
        generated_melbourne: 'x',
        puzzles: [
          basePuzzle({
            solution: { san: ['e4', 'e5'], uci: ['e2e4'] },
          }),
        ],
      }),
    /do not match/,
  );
  assert.throws(() => parsePatternsDocument({ generated_melbourne: 'x' }), /patterns/);
  assert.throws(() => parseOpeningsDocument({ generated_melbourne: 'x', as_white: [] }), /as_black/);
  assert.doesNotThrow(() =>
    parsePuzzlesDocument({
      generated_melbourne: 'x',
      puzzles: [basePuzzle({ goal: 'Win the rook', mate_in: null })],
    }),
  );
  assert.throws(
    () => parsePuzzlesDocument({ generated_melbourne: 'x', puzzles: [basePuzzle({ mate_in: '1' })] }),
    /mate_in/,
  );

  const games = read('games.json');
  const before = games.games[0].moves[0].eval;
  const parsed = parseGamesDocument(games);
  assert.equal(parsed, games);
  assert.ok(parsed.games.length > 0);
  if (parsed.counts != null) assert.equal(parsed.counts.games, parsed.games.length);
  assert.equal(parsed.games[0].moves[0].eval, before);
  assert.equal(parsed.games[0].moves[0].eval_cp, before.cp ?? parsed.games[0].moves[0].eval_cp);

  const broken = structuredClone(games.games[0]);
  const doc = {
    generated_melbourne: games.generated_melbourne,
    games: [broken],
  };
  doc.games[0].moves[0].judgment = 'guessed';
  assert.throws(() => parseGamesDocument(doc), /judgment/);
});

test('the exported puzzles, patterns, and openings match the schema', () => {
  const puzzles = parsePuzzlesDocument(read('puzzles.json'));
  assert.ok(puzzles.puzzles.length > 0);
  if (typeof puzzles.count === 'number') assert.equal(puzzles.count, puzzles.puzzles.length);
  const patterns = parsePatternsDocument(read('patterns.json'));
  assert.ok(patterns.patterns.length > 0);
  if (typeof patterns.count === 'number') assert.equal(patterns.count, patterns.patterns.length);
  if (typeof patterns.recurring_count === 'number') {
    assert.equal(patterns.recurring_count, patterns.patterns.filter((pattern) => pattern.recurring).length);
  }
  const puzzleIds = new Set(puzzles.puzzles.map((puzzle) => puzzle.id));
  for (const pattern of patterns.patterns) {
    assert.equal(pattern.count, pattern.puzzle_ids.length);
    for (const id of pattern.puzzle_ids) {
      assert.ok(puzzleIds.has(id), `${pattern.id} links ${id}, which is not in puzzles.json`);
    }
  }
  const openings = parseOpeningsDocument(read('openings.json'));
  assert.ok(openings.as_white.length > 0);
  assert.ok(openings.as_black.length > 0);
  assert.ok(openings.as_white.some((opening) => opening.variation == null));

  const sorted = sortPatterns(patterns.patterns);
  for (let index = 1; index < sorted.length; index += 1) {
    assert.ok(sorted[index - 1].count >= sorted[index].count);
  }
  assert.equal(sorted[0].count, Math.max(...patterns.patterns.map((pattern) => pattern.count)));

  for (const opening of [...openings.as_white, ...openings.as_black]) {
    const main = playSanLine(opening.moves);
    assert.equal(main.fens.length, main.sans.length + 1);
    for (const variation of opening.variations) {
      playSanLine(variation.moves);
    }
  }
});

test('san tokens drop move numbers', () => {
  assert.deepEqual(sanTokens('1.d4 d5 2.Nf3 e6 3.Nc3'), ['d4', 'd5', 'Nf3', 'e6', 'Nc3']);
});

function basePuzzle(overrides) {
  return {
    id: 'p-1-1',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    side_to_move: 'white',
    theme: 'fork',
    hint: 'Look for a fork.',
    played: { san: 'e3', uci: 'e2e3' },
    solution: { san: ['e4'], uci: ['e2e4'] },
    source: { game_id: '1', ply: 1, move_number: 1, opponent: 'a' },
    eval_before: { cp: 10 },
    eval_after: { cp: -10 },
    eval_best: { cp: 20 },
    ...overrides,
  };
}
