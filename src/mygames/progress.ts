/**
 * Chess Lab — puzzle solved / failed marks in localStorage.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { nextProgress } from './puzzle.mjs';
import type { PuzzleProgress, PuzzleStatus } from './types';

const KEY = 'chesslab.mygames.progress';

export function readProgress(): PuzzleProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const progress: PuzzleProgress = {};
    for (const [id, status] of Object.entries(raw)) {
      if (status === 'solved' || status === 'failed') progress[id] = status;
    }
    return progress;
  } catch {
    return {};
  }
}

export function writeProgress(progress: PuzzleProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* private mode */
  }
}

export function recordProgress(progress: PuzzleProgress, id: string, status: PuzzleStatus): PuzzleProgress {
  const next = nextProgress(progress, id, status) as PuzzleProgress;
  if (next !== progress) writeProgress(next);
  return next;
}
