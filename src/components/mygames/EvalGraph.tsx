/**
 * Chess Lab — eval graph from stored eval_cp values.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Y positions clip the stored centipawn number for display. The readout uses
 * the stored eval object (cp or mate). Nothing is searched or recomputed.
 */

import type { MouseEvent } from 'react';
import { clipEval, formatEval, judgmentSymbol } from '../../mygames/format.mjs';
import type { Judgment, StoredMove } from '../../mygames/types';

const WIDTH = 360;
const HEIGHT = 156;
const PAD_L = 32;
const PAD_R = 10;
const PAD_T = 18;
const PAD_B = 16;

const RANK: Record<string, number> = { blunder: 4, mistake: 3, great: 2, best: 1 };

export function EvalGraph({
  moves,
  ply,
  onJump,
}: {
  moves: StoredMove[];
  ply: number;
  onJump: (ply: number) => void;
}) {
  if (moves.length === 0) return <p className="muted">No moves to graph.</p>;

  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;
  const xOf = (index: number) =>
    PAD_L + (moves.length === 1 ? innerW / 2 : (index / (moves.length - 1)) * innerW);
  const yOf = (cp: number) => {
    const clipped = clipEval(cp) as number;
    const t = (clipped + 1500) / 3000;
    return PAD_T + (1 - t) * innerH;
  };

  const points = moves
    .map((move, index) => `${xOf(index).toFixed(1)},${yOf(move.eval_cp).toFixed(1)}`)
    .join(' ');
  const zeroY = yOf(0);
  const current = moves.find((move) => move.ply === ply) ?? null;
  const currentSymbol = current ? (judgmentSymbol(current.judgment) as string) : '';

  const placed = placeSymbols(moves, xOf);

  function jumpFrom(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    moves.forEach((_, index) => {
      const distance = Math.abs(xOf(index) - x);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    onJump(moves[nearest].ply);
  }

  return (
    <div className="graph-wrap">
      <svg
        data-testid="eval-graph"
        className="eval-graph"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label="Evaluation across the game, from your side of the board"
        onClick={jumpFrom}
      >
        <text x={2} y={PAD_T + 4} className="graph-label">
          +1.5
        </text>
        <text x={2} y={zeroY + 3} className="graph-label">
          0
        </text>
        <text x={2} y={HEIGHT - 4} className="graph-label">
          −1.5
        </text>
        <line className="graph-zero" x1={PAD_L} x2={WIDTH - PAD_R} y1={zeroY} y2={zeroY} />
        <polyline className="graph-line" points={points} />
        {moves.map((move, index) => {
          const symbol = judgmentSymbol(move.judgment) as string;
          const x = xOf(index);
          const y = yOf(move.eval_cp);
          const active = move.ply === ply;
          return (
            <g key={move.ply}>
              {active ? (
                <line className="graph-cursor" x1={x} x2={x} y1={PAD_T} y2={HEIGHT - PAD_B} />
              ) : null}
              <circle
                className={symbol ? `graph-dot ${move.judgment}` : 'graph-dot'}
                cx={x}
                cy={y}
                r={symbol ? 3.4 : 1.7}
              />
              <circle
                cx={x}
                cy={y}
                r={8}
                fill="transparent"
                pointerEvents="none"
                data-ply={move.ply}
                data-judgment={move.judgment ?? undefined}
              >
                <title>{`${move.san} ${formatEval(move.eval)}`}</title>
              </circle>
            </g>
          );
        })}
        {placed.map((item) =>
          item.move.ply === ply ? null : (
            <text
              key={`sym-${item.move.ply}`}
              className={`graph-sym ${item.move.judgment}`}
              x={item.x}
              y={13}
              textAnchor="middle"
            >
              {item.symbol}
            </text>
          ),
        )}
        {current && currentSymbol ? (
          <text
            className={`graph-sym ${current.judgment}`}
            x={xOf(moves.indexOf(current))}
            y={Math.max(12, yOf(current.eval_cp) - 8)}
            textAnchor="middle"
          >
            {currentSymbol}
          </text>
        ) : null}
      </svg>
      <p className="graph-readout" data-testid="graph-readout">
        {current ? (
          <>
            {currentSymbol ? <span className={`sym ${current.judgment}`}>{currentSymbol} </span> : null}
            {formatEval(current.eval) as string}
            <span className="muted">
              {' '}
              after {current.move_number}
              {current.colour === 'white' ? '.' : '…'} {current.san}
            </span>
          </>
        ) : (
          'Start'
        )}
      </p>
      <ul className="legend">
        <li>
          <span className="sym blunder">??</span> blunder
        </li>
        <li>
          <span className="sym mistake">?</span> mistake
        </li>
        <li>
          <span className="sym great">!!</span> great
        </li>
        <li>
          <span className="sym best">!</span> best
        </li>
      </ul>
    </div>
  );
}

function placeSymbols(moves: StoredMove[], xOf: (index: number) => number) {
  const marked = moves
    .map((move, index) => ({
      move,
      index,
      x: xOf(index),
      symbol: judgmentSymbol(move.judgment) as string,
      rank: RANK[move.judgment as Judgment] || 0,
    }))
    .filter((item) => item.symbol);
  const ordered = [...marked].sort((a, b) => b.rank - a.rank || a.index - b.index);
  const placed: typeof marked = [];
  for (const item of ordered) {
    if (placed.some((other) => Math.abs(other.x - item.x) < 14)) continue;
    placed.push(item);
  }
  return placed;
}
