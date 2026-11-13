/**
 * Chess Lab — newest-first game list.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useState } from 'react';
import { colorName, formatResult, formatWhen } from '../format';
import type { Game } from '../types';

const PAGE = 40;

export function GameList({ games, onOpen }: { games: Game[]; onOpen: (id: string) => void }) {
  const [shown, setShown] = useState(PAGE);
  const visible = games.slice(0, shown);

  return (
    <section className="list" aria-label="Games">
      <h2>
        Games <span className="count">{games.length}</span>
      </h2>
      {games.length === 0 ? <p className="muted">No games in this filter.</p> : null}
      <ul>
        {visible.map((game) => (
          <li key={game.id}>
            <button type="button" className="game" onClick={() => onOpen(game.id)}>
              <span className="game-top">
                <span className="when">{formatWhen(game.endTime)}</span>
                <span className={`result ${game.outcome.kind}`}>{formatResult(game)}</span>
              </span>
              <span className="game-mid">
                <span className={`dot ${game.playerColor === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
                <span className="tc">{game.timeClass}</span>
                <span className="as">{colorName(game.playerColor)}</span>
                <span className="vs">
                  vs {game.opponent}
                  {game.opponentRating != null ? ` (${game.opponentRating})` : ''}
                </span>
              </span>
              <span className="game-rating">
                {game.playerRating != null ? `Rating ${game.playerRating}` : 'Unrated'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown < games.length ? (
        <button type="button" className="more" onClick={() => setShown((value) => value + PAGE)}>
          Show more
        </button>
      ) : null}
    </section>
  );
}
