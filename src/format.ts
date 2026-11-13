/**
 * Chess Lab — display helpers.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { outcomeLabel } from './lib/archives.mjs';
import type { Game } from './types';

export function formatWhen(endTime: number): string {
  if (!endTime) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(endTime * 1000));
}

export function formatResult(game: Game): string {
  return outcomeLabel(game.outcome) as string;
}

export function colorName(color: 'w' | 'b'): string {
  return color === 'w' ? 'White' : 'Black';
}

const CLASS_ORDER = ['bullet', 'blitz', 'rapid', 'daily'];

export function timeClassOrder(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a);
    const bi = CLASS_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}
