/**
 * Chess Lab — move classification from centipawn loss.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Thresholds are the single source of truth for classification.
 * best: 0–10, good: 11–49 (<50), inaccuracy: 50–99,
 * mistake: 100–299, blunder: 300+.
 */

export const MOVE_CLASS_THRESHOLDS = Object.freeze({
  bestMax: 10,
  goodMax: 49,
  inaccuracyMax: 99,
  mistakeMax: 299,
});

export const EVAL_CLAMP = 1000;

export function clampEval(cp, limit = EVAL_CLAMP) {
  if (!Number.isFinite(cp)) return 0;
  return Math.max(-limit, Math.min(limit, cp));
}

/**
 * Engine score from the side to move, converted to centipawns.
 * Mates become a large finite value that shrinks slightly as the
 * distance grows, then callers clamp before measuring loss.
 * mate 0 (side to move is already mated) is a large loss.
 */
export function scoreToCentipawns(score) {
  if (!score) return 0;
  if (score.mate != null) {
    if (score.mate === 0) return -10000;
    const sign = Math.sign(score.mate);
    const magnitude = 10000 - Math.min(100, Math.abs(score.mate)) * 10;
    return sign * magnitude;
  }
  return score.cp ?? 0;
}

/** Side-to-move engine score expressed from White's point of view. */
export function whiteCentipawns(stmScore, turn) {
  const stm = scoreToCentipawns(stmScore);
  return turn === 'w' ? stm : -stm;
}

/**
 * Centipawn loss for the mover. Both inputs are White's point of view
 * (mate-converted, not yet clamped). Large swings above the clamp do
 * not count, so a completely won position stays "best" if it stays won.
 */
export function centipawnLossFromWhite(beforeWhiteCp, afterWhiteCp, mover) {
  const before = clampEval(mover === 'w' ? beforeWhiteCp : -beforeWhiteCp);
  const after = clampEval(mover === 'w' ? afterWhiteCp : -afterWhiteCp);
  return Math.max(0, Math.round(before - after));
}

export function classifyByCentipawnLoss(cpl) {
  const loss = Math.max(0, cpl);
  const t = MOVE_CLASS_THRESHOLDS;
  if (loss <= t.bestMax) return 'best';
  if (loss <= t.goodMax) return 'good';
  if (loss <= t.inaccuracyMax) return 'inaccuracy';
  if (loss <= t.mistakeMax) return 'mistake';
  return 'blunder';
}

export function emptyCounts() {
  return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

export function summarizeClassifications(classes) {
  const counts = emptyCounts();
  for (const kind of classes) {
    if (counts[kind] != null) counts[kind] += 1;
  }
  return counts;
}
