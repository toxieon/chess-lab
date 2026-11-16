import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Chess } from 'chess.js';
import {
  applyUci,
  countProgress,
  hintSquares,
  nextProgress,
  normalizeUci,
  reviewPlayerAttempt,
  solutionMoves,
} from '../src/mygames/puzzle.mjs';

test('a correct move returns the stored opponent reply and a wrong move says Try again', () => {
  const solution = {
    san: ['Bxe4', 'Bxe4', 'Kxf2'],
    uci: ['c2e4', 'h1e4', 'g3f2'],
  };
  const right = reviewPlayerAttempt(solution, 0, 'c2e4');
  assert.equal(right.correct, true);
  assert.equal(right.message, null);
  assert.equal(right.san, 'Bxe4');
  assert.deepEqual(right.autoReply, { uci: 'h1e4', san: 'Bxe4' });
  assert.equal(right.nextIndex, 2);
  assert.equal(right.complete, false);

  const wrong = reviewPlayerAttempt(solution, 0, 'g3h3');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.message, 'Try again');
  assert.equal(wrong.autoReply, null);
  assert.equal(wrong.complete, false);
  assert.equal(wrong.nextIndex, 0);

  const later = reviewPlayerAttempt(solution, 0, 'g3f2');
  assert.equal(later.correct, false);
  assert.equal(later.message, 'Try again');

  const opponentTurn = reviewPlayerAttempt(solution, 1, 'h1e4');
  assert.equal(opponentTurn.correct, false);
});

test('the line completes on the last player move or after the last reply', () => {
  const mate = { san: ['Qh5'], uci: ['d1h5'] };
  const only = reviewPlayerAttempt(mate, 0, 'D1H5');
  assert.equal(only.correct, true);
  assert.equal(only.autoReply, null);
  assert.equal(only.complete, true);
  assert.equal(only.nextIndex, 1);

  const pair = { san: ['Nf3', 'Nc6'], uci: ['g1f3', 'b8c6'] };
  const first = reviewPlayerAttempt(pair, 0, 'g1f3');
  assert.equal(first.complete, true);
  assert.equal(first.autoReply.uci, 'b8c6');
  assert.equal(first.nextIndex, 2);
});

test('promotion letters are compared case-insensitively and must match', () => {
  const solution = { san: ['a8=Q'], uci: ['a7a8q'] };
  assert.equal(reviewPlayerAttempt(solution, 0, 'a7a8Q').correct, true);
  assert.equal(reviewPlayerAttempt(solution, 0, 'a7a8r').correct, false);
  assert.equal(reviewPlayerAttempt(solution, 0, 'a7a8').message, 'Try again');
  assert.deepEqual(hintSquares('A7A8q'), { from: 'a7', to: 'a8' });
  assert.equal(normalizeUci(' E2E4 '), 'e2e4');
});

test('applyUci plays a legal stored move and rejects an illegal one', () => {
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const played = applyUci(start, 'e2e4');
  assert.equal(played.san, 'e4');
  assert.equal(played.uci, 'e2e4');
  assert.equal(applyUci(start, 'e2e5'), null);

  const promo = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
  const queen = applyUci(promo, 'a7a8q');
  assert.ok(queen.fen.includes('Q'));
  assert.equal(applyUci(promo, 'a7a8'), null);
});

test('solved sticks, and a clean solve replaces a miss', () => {
  const missed = nextProgress({}, 'p-1', 'failed');
  assert.equal(missed['p-1'], 'failed');
  const solved = nextProgress(missed, 'p-1', 'solved');
  assert.equal(solved['p-1'], 'solved');
  const still = nextProgress(solved, 'p-1', 'failed');
  assert.equal(still, solved);
  assert.equal(still['p-1'], 'solved');
  assert.deepEqual(countProgress(solved), { solved: 1, failed: 0 });
});

test('every exported puzzle line is the stored solution and plays from the fen', () => {
  const doc = JSON.parse(readFileSync(new URL('../public/data/my-games/puzzles.json', import.meta.url), 'utf8'));
  assert.ok(doc.puzzles.length > 0);
  if (typeof doc.count === 'number') assert.equal(doc.count, doc.puzzles.length);
  for (const puzzle of doc.puzzles) {
    const chess = new Chess(puzzle.fen);
    assert.equal(chess.turn(), puzzle.side_to_move === 'white' ? 'w' : 'b');
    const moves = solutionMoves(puzzle.solution);
    assert.notEqual(normalizeUci(puzzle.played.uci), moves[0].uci);
    const wrong = reviewPlayerAttempt(puzzle.solution, 0, puzzle.played.uci);
    assert.equal(wrong.correct, false);
    assert.equal(wrong.message, 'Try again');

    let fen = puzzle.fen;
    let step = 0;
    while (step < moves.length) {
      const review = reviewPlayerAttempt(puzzle.solution, step, moves[step].uci);
      assert.equal(review.correct, true, puzzle.id);
      assert.equal(review.san, moves[step].san);
      const played = applyUci(fen, moves[step].uci);
      assert.ok(played, `${puzzle.id} ${moves[step].uci}`);
      assert.equal(played.san, moves[step].san);
      fen = played.fen;
      if (review.autoReply) {
        assert.equal(review.autoReply.uci, moves[step + 1].uci);
        assert.equal(review.autoReply.san, moves[step + 1].san);
        const reply = applyUci(fen, review.autoReply.uci);
        assert.ok(reply, `${puzzle.id} reply`);
        assert.equal(reply.san, review.autoReply.san);
        fen = reply.fen;
      }
      step = review.nextIndex;
    }
    assert.ok(step >= moves.length);
  }
});
