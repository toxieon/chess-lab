/**
 * Chess Lab — rating-over-time chart (hand-rolled SVG).
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Game } from '../types';

const COLORS: Record<string, string> = {
  bullet: '#f07178',
  blitz: '#e6c07b',
  rapid: '#7aa2f7',
  daily: '#9ece6a',
};

const WIDTH = 360;
const HEIGHT = 148;
const PAD_X = 8;
const PAD_Y = 16;

function colorFor(timeClass: string): string {
  return COLORS[timeClass] || '#c0caf5';
}

function pointsOf(games: Game[]): Array<{ t: number; r: number }> {
  return games
    .filter((game) => game.playerRating != null && game.endTime > 0)
    .map((game) => ({ t: game.endTime, r: game.playerRating as number }));
}

function pathFor(
  points: Array<{ t: number; r: number }>,
  t0: number,
  span: number,
  min: number,
  range: number,
): string {
  const maxPoints = 360;
  const sampled =
    points.length <= maxPoints
      ? points
      : Array.from({ length: maxPoints }, (_, index) => {
          const at = Math.round((index * (points.length - 1)) / (maxPoints - 1));
          return points[at];
        });
  return sampled
    .map((point) => {
      const x = PAD_X + ((point.t - t0) / span) * (WIDTH - PAD_X * 2);
      const y = PAD_Y + (1 - (point.r - min) / range) * (HEIGHT - PAD_Y * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function RatingChart({ games }: { games: Game[] }) {
  const byClass = new Map<string, Game[]>();
  for (const game of games) {
    const list = byClass.get(game.timeClass) ?? [];
    list.push(game);
    byClass.set(game.timeClass, list);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => a.endTime - b.endTime);
  }

  const series = [...byClass.entries()]
    .map(([timeClass, list]) => ({ timeClass, points: pointsOf(list) }))
    .filter((entry) => entry.points.length > 0);

  if (series.length === 0) {
    return <p className="muted">No rated games for this filter yet.</p>;
  }

  const all = series.flatMap((entry) => entry.points);
  const t0 = Math.min(...all.map((point) => point.t));
  const t1 = Math.max(...all.map((point) => point.t));
  const span = Math.max(1, t1 - t0);
  const ratings = all.map((point) => point.r);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = Math.max(20, maxR - minR);
  const latest = all.reduce((best, point) => (point.t > best.t ? point : best), all[0]);

  return (
    <section className="chart" aria-label="Rating over time">
      <div className="chart-head">
        <h2>Rating</h2>
        <strong>{latest.r}</strong>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img">
        <text x={PAD_X} y={12} className="chart-label">
          {maxR}
        </text>
        <text x={PAD_X} y={HEIGHT - 2} className="chart-label">
          {minR}
        </text>
        {series.map((entry) => (
          <polyline
            key={entry.timeClass}
            fill="none"
            stroke={colorFor(entry.timeClass)}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={pathFor(entry.points, t0, span, minR, range)}
          />
        ))}
      </svg>
      <ul className="legend">
        {series.map((entry) => (
          <li key={entry.timeClass}>
            <span className="swatch" style={{ background: colorFor(entry.timeClass) }} />
            {entry.timeClass}
          </li>
        ))}
      </ul>
    </section>
  );
}
