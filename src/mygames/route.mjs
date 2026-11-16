/**
 * Chess Lab — hash routes for My Games.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The rating section keeps `#g=<id>`. My Games uses its own hashes,
 * including `#puzzle=<id>` and `#game=<id>&ply=<n>`.
 */

export function parseRoute(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (raw === '' || raw === 'rating' || raw.startsWith('g=')) {
    return { page: 'lab' };
  }
  const params = new URLSearchParams(raw);
  if (params.has('puzzle')) {
    return { page: 'puzzle', id: params.get('puzzle') || '' };
  }
  if (params.has('game')) {
    const ply = Number(params.get('ply'));
    return {
      page: 'game',
      id: params.get('game') || '',
      ply: Number.isInteger(ply) && ply > 0 ? ply : 0,
    };
  }
  if (raw === 'puzzles' || raw.startsWith('puzzles')) return { page: 'puzzles' };
  if (raw === 'patterns' || raw.startsWith('patterns')) return { page: 'patterns' };
  if (raw === 'openings' || raw.startsWith('openings')) return { page: 'openings' };
  if (raw === 'mygames' || raw.startsWith('mygames')) return { page: 'games' };
  return { page: 'lab' };
}

export function puzzleHash(id) {
  return `#puzzle=${encodeURIComponent(id)}`;
}

export function gameHash(id, ply = 0) {
  const base = `game=${encodeURIComponent(id)}`;
  return ply > 0 ? `#${base}&ply=${ply}` : `#${base}`;
}
