/**
 * Chess Lab — list of exported games, newest first.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useMemo, useState } from 'react';
import { colourLabel, formatMelbourne, resultLabel } from '../../mygames/format.mjs';
import type { StoredGame } from '../../mygames/types';
import { Updated } from './bits';

const PAGE = 40;

export function GameIndex({ games, updated }: { games: StoredGame[]; updated: string }) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? games.filter((game) => {
          return (
            game.opponent.toLowerCase().includes(needle) ||
            game.opening.name.toLowerCase().includes(needle) ||
            game.opening.family.toLowerCase().includes(needle) ||
            game.opening.eco.toLowerCase().includes(needle) ||
            game.result.startsWith(needle)
          );
        })
      : games;
    return [...filtered].reverse();
  }, [games, query]);

  const visible = shown.slice(0, limit);

  return (
    <section className="list" aria-label="My games">
      <Updated iso={updated} />
      <h2>
        Games <span className="count">{shown.length}</span>
      </h2>
      <input
        className="search"
        type="search"
        enterKeyHint="search"
        placeholder="Opponent or opening"
        value={query}
        aria-label="Filter games"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE);
        }}
      />
      {shown.length === 0 ? <p className="muted">No games match.</p> : null}
      <ul>
        {visible.map((game) => (
          <li key={game.id}>
            <a className="game" href={`#game=${encodeURIComponent(game.id)}`}>
              <span className="game-top">
                <span className="when">{formatMelbourne(game.date, false) as string}</span>
                <span className={`result ${game.result}`}>{resultLabel(game.result) as string}</span>
              </span>
              <span className="game-mid">
                <span className={`dot ${game.colour}`} aria-hidden="true" />
                <span className="as">{colourLabel(game.colour) as string}</span>
                <span className="vs">vs {game.opponent}</span>
                {game.time_control_label ? <span className="tc">{game.time_control_label}</span> : null}
              </span>
              <span className="opening-name">
                {game.opening.name} <span className="muted">{game.opening.eco}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {limit < shown.length ? (
        <button type="button" className="more" onClick={() => setLimit((value) => value + PAGE)}>
          Show more
        </button>
      ) : null}
    </section>
  );
}
