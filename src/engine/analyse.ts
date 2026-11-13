/**
 * Chess Lab — per-position Stockfish analysis.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Chess } from 'chess.js';
import {
  centipawnLossFromWhite,
  classifyByCentipawnLoss,
  emptyCounts,
  whiteCentipawns,
} from '../lib/classify.mjs';
import { readGame, uciToSan } from '../lib/moves.mjs';
import type { GameAnalysis, MoveAnnotation, PositionEval } from '../types';
import { getEngine, sendCommands } from './uciSession';

export type AnalyseProgress = {
  done: number;
  total: number;
  positions: Array<PositionEval | null>;
};

type EngineScore = { cp: number | null; mate: number | null; bestUci: string | null };

function parseEngineLines(lines: string[]): EngineScore {
  let cp: number | null = null;
  let mate: number | null = null;
  let bestUci: string | null = null;
  let bestDepth = -1;

  for (const line of lines) {
    if (
      line.startsWith('info ') &&
      line.includes(' score ') &&
      !line.includes('lowerbound') &&
      !line.includes('upperbound')
    ) {
      const depthMatch = line.match(/\bdepth (\d+)/);
      const depth = depthMatch ? Number(depthMatch[1]) : 0;
      if (depth < bestDepth) continue;
      bestDepth = depth;
      const cpMatch = line.match(/\bscore cp (-?\d+)/);
      const mateMatch = line.match(/\bscore mate (-?\d+)/);
      const pvMatch = line.match(/\bpv (\S+)/);
      if (cpMatch) {
        cp = Number(cpMatch[1]);
        mate = null;
      } else if (mateMatch) {
        mate = Number(mateMatch[1]);
        cp = null;
      }
      if (pvMatch) bestUci = pvMatch[1];
    } else if (line.startsWith('bestmove')) {
      const match = line.match(/^bestmove (\S+)/);
      if (match && match[1] !== '(none)') bestUci = match[1];
    }
  }

  return { cp, mate, bestUci };
}

function terminalPosition(fen: string): (PositionEval & { bestUci: null }) | null {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    const whiteMated = chess.turn() === 'w';
    return {
      whiteCp: whiteMated ? -10000 : 10000,
      mate: whiteMated ? -1 : 1,
      bestUci: null,
    };
  }
  if (chess.isDraw()) {
    return { whiteCp: 0, mate: null, bestUci: null };
  }
  return null;
}

async function evaluateFen(
  worker: Worker,
  fen: string,
  depth: number,
  signal: AbortSignal,
): Promise<PositionEval & { bestUci: string | null }> {
  const terminal = terminalPosition(fen);
  if (terminal) return terminal;

  const turn = new Chess(fen).turn();
  const lines = await sendCommands(worker, [`position fen ${fen}`, `go depth ${depth}`], 'bestmove', {
    signal,
    timeoutMs: 90_000,
  });
  const parsed = parseEngineLines(lines);
  const whiteCp = whiteCentipawns({ cp: parsed.cp ?? 0, mate: parsed.mate }, turn);
  const mate = parsed.mate == null ? null : turn === 'w' ? parsed.mate : -parsed.mate;
  return { whiteCp, mate, bestUci: parsed.bestUci };
}

export async function analyseGame(options: {
  gameId: string;
  pgn: string;
  playerColor: 'w' | 'b';
  depth: number;
  signal: AbortSignal;
  onProgress: (progress: AnalyseProgress) => void;
}): Promise<GameAnalysis> {
  const { fens, moves } = readGame(options.pgn);
  const worker = await getEngine();
  if (options.signal.aborted) throw new DOMException('aborted', 'AbortError');

  const positions: Array<PositionEval | null> = fens.map(() => null);
  const scored: Array<PositionEval & { bestUci: string | null }> = [];

  for (let ply = 0; ply < fens.length; ply += 1) {
    if (options.signal.aborted) throw new DOMException('aborted', 'AbortError');
    const evaln = await evaluateFen(worker, fens[ply], options.depth, options.signal);
    scored.push(evaln);
    positions[ply] = { whiteCp: evaln.whiteCp, mate: evaln.mate };
    options.onProgress({
      done: ply + 1,
      total: fens.length,
      positions: positions.slice(),
    });
  }

  const annotations: MoveAnnotation[] = [];
  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    if (move.color !== options.playerColor) continue;
    const before = scored[index];
    const after = scored[index + 1];
    const cpl = centipawnLossFromWhite(before.whiteCp, after.whiteCp, move.color);
    const classification = classifyByCentipawnLoss(cpl);
    const bestUci = before.bestUci;
    annotations.push({
      ply: index + 1,
      classification,
      cpl,
      bestUci,
      bestSan: bestUci ? uciToSan(fens[index], bestUci) : null,
    });
  }

  const counts = emptyCounts();
  for (const annotation of annotations) counts[annotation.classification] += 1;

  return {
    version: 1,
    gameId: options.gameId,
    depth: options.depth,
    positions: positions.map((position) => position ?? { whiteCp: 0, mate: null }),
    moves: annotations,
    counts,
  };
}
