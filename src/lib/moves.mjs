/**
 * Chess Lab — PGN replay helpers.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Chess } from 'chess.js';

export function readGame(pgn) {
  const chess = new Chess();
  chess.loadPgn(pgn, { strict: false });
  const history = chess.history({ verbose: true });
  const moves = [];
  const fens = [];

  if (history.length === 0) {
    fens.push(chess.fen());
    return { fens, moves };
  }

  fens.push(history[0].before);
  for (const move of history) {
    moves.push({
      san: move.san,
      color: move.color,
      from: move.from,
      to: move.to,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
    });
    fens.push(move.after);
  }
  return { fens, moves };
}

export function uciToSan(fen, uci) {
  if (!uci || uci === '(none)' || uci.length < 4) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] || undefined,
    });
    return move ? move.san : null;
  } catch {
    return null;
  }
}
