/**
 * Chess Lab — step through a stored SAN line.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Chess } from 'chess.js';

export function sanTokens(moves) {
  return String(moves || '')
    .replace(/\d+\.(?:\.\.)?/g, ' ')
    .split(/\s+/)
    .filter((token) => token && token !== '1-0' && token !== '0-1' && token !== '1/2-1/2' && token !== '*');
}

/** Replay a SAN line from the starting position. Throws if a token is illegal. */
export function playSanLine(moves) {
  const chess = new Chess();
  const tokens = sanTokens(moves);
  const fens = [chess.fen()];
  const sans = [];
  for (const token of tokens) {
    let move;
    try {
      move = chess.move(token);
    } catch {
      throw new Error(`Could not play ${token}`);
    }
    if (!move) throw new Error(`Could not play ${token}`);
    sans.push(move.san);
    fens.push(chess.fen());
  }
  return { fens, sans };
}
