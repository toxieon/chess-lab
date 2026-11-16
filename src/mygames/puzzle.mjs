/**
 * Chess Lab — check a puzzle attempt against the stored solution line.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The solution is the export's UCI/SAN lists. This does not search for a move.
 */

import { Chess } from 'chess.js';

export function normalizeUci(uci) {
  return String(uci ?? '').trim().toLowerCase();
}

export function solutionMoves(solution) {
  if (!solution || !Array.isArray(solution.uci) || !Array.isArray(solution.san)) {
    throw new Error('Puzzle solution is missing uci and san lists.');
  }
  if (solution.uci.length !== solution.san.length || solution.uci.length === 0) {
    throw new Error('Puzzle solution uci and san lists do not match.');
  }
  return solution.uci.map((uci, index) => ({
    uci: normalizeUci(uci),
    san: String(solution.san[index]),
  }));
}

/**
 * Review the move Brandon just tried.
 * `stepIndex` is his ply in the solution (0, 2, 4, …). Opponent replies are the odd indexes.
 * A correct move includes the stored opponent reply when the line has one.
 */
export function reviewPlayerAttempt(solution, stepIndex, playedUci) {
  const moves = solutionMoves(solution);
  const expected = moves[stepIndex];
  const played = normalizeUci(playedUci);
  if (!expected || stepIndex % 2 !== 0 || played !== expected.uci) {
    return {
      correct: false,
      message: 'Try again',
      san: null,
      autoReply: null,
      nextIndex: stepIndex,
      complete: false,
    };
  }
  const autoReply = moves[stepIndex + 1] || null;
  const nextIndex = autoReply ? stepIndex + 2 : stepIndex + 1;
  return {
    correct: true,
    message: null,
    san: expected.san,
    autoReply,
    nextIndex,
    complete: nextIndex >= moves.length,
  };
}

export function hintSquares(uci) {
  const normal = normalizeUci(uci);
  if (!/^[a-h][1-8][a-h][1-8]/.test(normal)) return null;
  return { from: normal.slice(0, 2), to: normal.slice(2, 4) };
}

export function arrowSquares(uci) {
  return hintSquares(uci);
}

/** Apply a stored UCI to a FEN. Returns null when the move is illegal. */
export function applyUci(fen, uci) {
  const normal = normalizeUci(uci);
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(normal)) return null;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: normal.slice(0, 2),
      to: normal.slice(2, 4),
      promotion: normal[4] || undefined,
    });
    if (!move) return null;
    return {
      fen: chess.fen(),
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion || ''}`,
    };
  } catch {
    return null;
  }
}

/**
 * Solved sticks. A later miss does not downgrade it.
 * A clean solve replaces an earlier miss.
 */
export function nextProgress(progress, id, status) {
  const current = progress && typeof progress === 'object' ? progress : {};
  if (status !== 'solved' && status !== 'failed') return current;
  if (!id) return current;
  if (current[id] === 'solved') return current;
  if (current[id] === status) return current;
  return { ...current, [id]: status };
}

export function countProgress(progress) {
  let solved = 0;
  let failed = 0;
  if (!progress || typeof progress !== 'object') return { solved, failed };
  for (const value of Object.values(progress)) {
    if (value === 'solved') solved += 1;
    else if (value === 'failed') failed += 1;
  }
  return { solved, failed };
}
