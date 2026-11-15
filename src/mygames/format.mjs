/**
 * Chess Lab — display helpers for the precomputed My Games export.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Scores shown here are the stored eval objects. Nothing is recomputed.
 */

export const EVAL_CLIP = 1500;

const SYMBOLS = {
  blunder: '??',
  mistake: '?',
  great: '!!',
  best: '!',
};

const LABELS = {
  blunder: 'Blunder',
  mistake: 'Mistake',
  great: 'Great move',
  best: 'Best move',
};

export function judgmentSymbol(judgment) {
  return SYMBOLS[judgment] || '';
}

export function judgmentLabel(judgment) {
  return LABELS[judgment] || '';
}

export function clipEval(cp) {
  if (typeof cp !== 'number' || !Number.isFinite(cp)) return 0;
  return Math.max(-EVAL_CLIP, Math.min(EVAL_CLIP, cp));
}

/** Format a stored `{cp}` or `{mate}` object from Brandon's side. */
export function formatEval(score) {
  if (!score || typeof score !== 'object') return '';
  if (typeof score.mate === 'number') {
    if (score.mate === 0) return 'Checkmate';
    if (score.mate > 0) return `Mate in ${score.mate}`;
    return `Mated in ${Math.abs(score.mate)}`;
  }
  if (typeof score.cp === 'number' && Number.isFinite(score.cp)) {
    const pawns = score.cp / 100;
    const text = Math.abs(pawns).toFixed(2);
    if (pawns > 0) return `+${text}`;
    if (pawns < 0) return `-${text}`;
    return '0.00';
  }
  return '';
}

export function formatMelbourne(iso, withTime = true) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatUpdated(iso) {
  const when = formatMelbourne(iso, true);
  return when ? `Updated ${when}` : 'Updated time unavailable';
}

export function resultLabel(result) {
  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Loss';
  if (result === 'draw') return 'Draw';
  return typeof result === 'string' ? result : '';
}

export function colourLabel(colour) {
  if (colour === 'white') return 'White';
  if (colour === 'black') return 'Black';
  return typeof colour === 'string' ? colour : '';
}

export function formatScore(pct) {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return '—';
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function formatWdl(row) {
  return `${row.win}–${row.draw}–${row.loss}`;
}
