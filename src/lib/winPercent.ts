/**
 * Win percentage for the evaluation bar.
 *
 * Adapted from Chesskit `src/lib/engine/helpers/winPercentage.ts`
 * (`getWinPercentageFromCp`).
 * Copyright (C) GuillaumeSD and Chesskit contributors.
 * https://github.com/GuillaumeSD/Chesskit/blob/main/src/lib/engine/helpers/winPercentage.ts
 * Licensed under the GNU Affero General Public License, version 3.
 *
 * The curve itself is the Lichess win-percent formula cited in that file:
 * https://github.com/lichess-org/lila/pull/11148
 */

const MULTIPLIER = -0.00368208;

export function whiteWinPercent(whiteCp: number): number {
  const cp = Math.max(-1000, Math.min(1000, whiteCp));
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * cp)) - 1;
  return 50 + 50 * winChances;
}

export function evalLabel(whiteCp: number, mate: number | null): string {
  if (mate != null && mate !== 0) {
    const abs = Math.abs(mate);
    return mate > 0 ? `M${abs}` : `-M${abs}`;
  }
  const pawns = Math.max(-15, Math.min(15, whiteCp / 100));
  const text = Math.abs(pawns).toFixed(1);
  if (pawns > 0) return `+${text}`;
  if (pawns < 0) return `-${text}`;
  return '0.0';
}

export function barPercent(whiteCp: number, mate: number | null): number {
  if (mate != null && mate !== 0) return mate > 0 ? 100 : 0;
  return whiteWinPercent(whiteCp);
}
