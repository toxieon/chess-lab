/**
 * Chess Lab — personal Chess.com rating and analysis.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect, useMemo, useState } from 'react';
import { CHESSKIT_URL, PLAYER, SOURCE_URL, STOCKFISH_JS_URL, STOCKFISH_URL } from './config';
import { GameList } from './components/GameList';
import { GameViewer } from './components/GameViewer';
import { RatingChart } from './components/RatingChart';
import { useGameLibrary } from './data/useGameLibrary';
import { timeClassOrder } from './format';

function readHash(): string | null {
  const match = window.location.hash.match(/^#g=(.+)$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function App() {
  const { games, status, error, refresh } = useGameLibrary();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(readHash);

  useEffect(() => {
    const onHash = () => setSelectedId(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const classes = useMemo(
    () => timeClassOrder([...new Set(games.map((game) => game.timeClass))]),
    [games],
  );
  const filtered = useMemo(
    () => (filter === 'all' ? games : games.filter((game) => game.timeClass === filter)),
    [games, filter],
  );
  const selected = selectedId ? games.find((game) => game.id === selectedId) ?? null : null;

  function openGame(id: string) {
    setSelectedId(id);
    const hash = `#g=${encodeURIComponent(id)}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
  }

  function closeGame() {
    setSelectedId(null);
    window.history.pushState(null, '', window.location.pathname + window.location.search);
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Chess Lab</h1>
          <p className="who">{PLAYER}</p>
        </div>
      </header>

      {error ? (
        <p className="banner" role="alert">
          {error}{' '}
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </p>
      ) : null}
      <p className="status">{status}</p>

      {selected ? (
        <GameViewer game={selected} onBack={closeGame} />
      ) : selectedId && games.length === 0 ? (
        <p className="muted">Opening game…</p>
      ) : (
        <>
          {selectedId && !selected && games.length > 0 ? (
            <p className="banner">That game is not in the loaded archives.</p>
          ) : null}
          <div className="filters" role="tablist" aria-label="Time class">
            <FilterChip label="All" count={games.length} active={filter === 'all'} onClick={() => setFilter('all')} />
            {classes.map((timeClass) => (
              <FilterChip
                key={timeClass}
                label={timeClass}
                count={games.filter((game) => game.timeClass === timeClass).length}
                active={filter === timeClass}
                onClick={() => setFilter(timeClass)}
              />
            ))}
          </div>
          <RatingChart games={filtered} />
          <GameList key={filter} games={filtered} onOpen={openGame} />
          <details className="about">
            <summary>About</summary>
            <p>
              Rating and game review for one Chess.com account. Games come from the public Chess.com API.
              Past months are cached in this browser. The current month is refreshed on load and about every
              five minutes while the tab is open.
            </p>
            <p>
              Analysis runs Stockfish 18 Lite in a single-threaded Web Worker (GPL-3.0). Move marks use
              centipawn loss from your side of the board: best 0–10, good under 50, inaccuracy 50–99, mistake
              100–299, blunder 300 or more.
            </p>
            <p>
              Board replay follows ideas from{' '}
              <a href={CHESSKIT_URL}>Chesskit</a> (AGPL-3.0). Adapted parts are listed in NOTICE.
            </p>
          </details>
        </>
      )}

      <footer className="foot">
        <a href={SOURCE_URL}>Source code</a>
        <span>AGPL-3.0-only</span>
        <a href={STOCKFISH_URL}>Stockfish</a>
        <a href={STOCKFISH_JS_URL}>stockfish.js</a>
        <span>GPL-3.0</span>
      </footer>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? 'chip on' : 'chip'} onClick={onClick} aria-pressed={active}>
      {label} <span>{count}</span>
    </button>
  );
}
