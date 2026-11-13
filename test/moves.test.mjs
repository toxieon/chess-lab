import assert from 'node:assert/strict';
import test from 'node:test';
import { readGame, uciToSan } from '../src/lib/moves.mjs';

const PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.06.01"]
[White "brandonneillthegreat"]
[Black "someone"]
[Result "1-0"]
[TimeControl "180"]

1. e4 {[%clk 0:02:59]} e5 {[%clk 0:02:58]} 2. Nf3 Nc6 1-0
`;

test('readGame replays a Chess.com PGN with clock comments', () => {
  const game = readGame(PGN);
  assert.deepEqual(
    game.moves.map((move) => move.san),
    ['e4', 'e5', 'Nf3', 'Nc6'],
  );
  assert.equal(game.moves[0].uci, 'e2e4');
  assert.equal(game.moves[0].color, 'w');
  assert.equal(game.fens.length, 5);
  assert.equal(game.fens[0], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.equal(game.fens[1], game.moves[0] && readGame(PGN).fens[1]);
});

test('uciToSan uses chess.js for the best-move label', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  assert.equal(uciToSan(start, 'e2e4'), 'e4');
  assert.equal(uciToSan(start, 'g1f3'), 'Nf3');
  assert.equal(uciToSan('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7a8q'), 'a8=Q+');
  assert.equal(uciToSan(start, '(none)'), null);
  assert.equal(uciToSan(start, 'e2e5'), null);
});
