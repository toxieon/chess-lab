import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MOVE_CLASS_THRESHOLDS,
  centipawnLossFromWhite,
  classifyByCentipawnLoss,
  scoreToCentipawns,
  summarizeClassifications,
  whiteCentipawns,
} from '../src/lib/classify.mjs';

test('classification thresholds are a single constant', () => {
  assert.equal(MOVE_CLASS_THRESHOLDS.bestMax, 10);
  assert.equal(MOVE_CLASS_THRESHOLDS.goodMax, 49);
  assert.equal(MOVE_CLASS_THRESHOLDS.inaccuracyMax, 99);
  assert.equal(MOVE_CLASS_THRESHOLDS.mistakeMax, 299);
  assert.equal(classifyByCentipawnLoss(0), 'best');
  assert.equal(classifyByCentipawnLoss(10), 'best');
  assert.equal(classifyByCentipawnLoss(11), 'good');
  assert.equal(classifyByCentipawnLoss(49), 'good');
  assert.equal(classifyByCentipawnLoss(50), 'inaccuracy');
  assert.equal(classifyByCentipawnLoss(99), 'inaccuracy');
  assert.equal(classifyByCentipawnLoss(100), 'mistake');
  assert.equal(classifyByCentipawnLoss(299), 'mistake');
  assert.equal(classifyByCentipawnLoss(300), 'blunder');
  assert.equal(classifyByCentipawnLoss(800), 'blunder');
});

test('mate scores become large centipawn values and clamp before loss', () => {
  assert.equal(scoreToCentipawns({ mate: 1 }), 9990);
  assert.equal(scoreToCentipawns({ mate: -2 }), -9980);
  assert.equal(scoreToCentipawns({ mate: 0 }), -10000);
  assert.equal(scoreToCentipawns({ cp: 34 }), 34);

  const before = whiteCentipawns({ mate: 1 }, 'w');
  const after = whiteCentipawns({ cp: 200 }, 'b');
  assert.equal(before, 9990);
  assert.equal(after, -200);
  // Mate value and the resulting loss are both clamped at ±1000.
  assert.equal(centipawnLossFromWhite(before, after, 'w'), 1200);
  assert.equal(classifyByCentipawnLoss(centipawnLossFromWhite(before, after, 'w')), 'blunder');

  const stillWinning = centipawnLossFromWhite(2500, 1800, 'w');
  assert.equal(stillWinning, 0);
  assert.equal(classifyByCentipawnLoss(stillWinning), 'best');
});

test('loss is measured from the mover, including Black', () => {
  const before = whiteCentipawns({ cp: 50 }, 'b');
  const after = whiteCentipawns({ cp: 300 }, 'w');
  assert.equal(before, -50);
  assert.equal(after, 300);
  const loss = centipawnLossFromWhite(before, after, 'b');
  assert.equal(loss, 350);
  assert.equal(classifyByCentipawnLoss(loss), 'blunder');

  const fine = centipawnLossFromWhite(
    whiteCentipawns({ cp: 80 }, 'w'),
    whiteCentipawns({ cp: -60 }, 'b'),
    'w',
  );
  assert.equal(fine, 20);
  assert.equal(classifyByCentipawnLoss(fine), 'good');
});

test('summary counts each class', () => {
  assert.deepEqual(summarizeClassifications(['best', 'best', 'blunder', 'good']), {
    best: 2,
    good: 1,
    inaccuracy: 0,
    mistake: 0,
    blunder: 1,
  });
});
