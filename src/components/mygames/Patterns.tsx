/**
 * Chess Lab — recurring mistakes from patterns.json.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useMemo } from 'react';
import { sortPatterns } from '../../mygames/parse.mjs';
import type { Pattern, Puzzle } from '../../mygames/types';
import { Updated } from './bits';

export function Patterns({
  patterns,
  puzzles,
  updated,
}: {
  patterns: Pattern[];
  puzzles: Puzzle[];
  updated: string;
}) {
  const ordered = useMemo(() => sortPatterns(patterns) as Pattern[], [patterns]);
  const byId = useMemo(() => new Map(puzzles.map((puzzle) => [puzzle.id, puzzle])), [puzzles]);

  return (
    <section className="list" aria-label="Repeat offences" data-testid="patterns">
      <Updated iso={updated} />
      <h2>
        Repeat offences <span className="count">{ordered.length}</span>
      </h2>
      <p className="hint">The same kind of mistake, with the puzzles that came from it. Sorted by how often it happened.</p>
      {ordered.length === 0 ? <p className="muted">No patterns in this export.</p> : null}
      {ordered.map((pattern) => (
        <article key={pattern.id} className={pattern.recurring ? 'pattern recurring' : 'pattern'}>
          <h3>
            {pattern.title} <span className="count">{pattern.count}</span>
          </h3>
          <p className="pill">{pattern.recurring ? 'Recurring' : 'Seen once'}</p>
          <p>{pattern.description}</p>
          <div className="puzzle-links">
            {pattern.puzzle_ids.map((id) => {
              const puzzle = byId.get(id);
              const label = puzzle
                ? `Move ${puzzle.source.move_number} vs ${puzzle.source.opponent}`
                : id;
              return (
                <a key={id} href={`#puzzle=${encodeURIComponent(id)}`}>
                  {label}
                </a>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
