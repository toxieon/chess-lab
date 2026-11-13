/**
 * Chess Lab — evaluation bar.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The fill height uses the win-percent helper adapted from Chesskit's
 * evaluation bar. This component's markup is original.
 */

import { barPercent, evalLabel } from '../lib/winPercent';

export function EvalBar({
  whiteCp,
  mate,
  known,
  height,
}: {
  whiteCp: number;
  mate: number | null;
  known: boolean;
  height: number;
}) {
  const percent = known ? barPercent(whiteCp, mate) : 50;
  const label = known ? evalLabel(whiteCp, mate) : '–';
  return (
    <div className="eval">
      <div className="eval-label" title="Evaluation from White's point of view">
        {label}
      </div>
      <div className="eval-track" style={{ height }} aria-hidden="true">
        <div className="eval-white" style={{ height: `${percent}%` }} />
      </div>
    </div>
  );
}
