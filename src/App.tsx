/**
 * Chess Lab — personal Chess.com rating and analysis.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useEffect, useState } from 'react';
import { MyGames, MyGamesNav } from './components/mygames/MyGames';
import { PLAYER, SOURCE_URL, STOCKFISH_JS_URL, STOCKFISH_URL } from './config';
import { Lab } from './Lab';
import { parseRoute } from './mygames/route.mjs';
import type { MyRoute } from './mygames/types';

export function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash) as MyRoute);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash) as MyRoute);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((hash: string, mode: 'push' | 'replace' = 'push') => {
    const next = hash.startsWith('#') ? hash : `#${hash}`;
    if (window.location.hash !== next) {
      if (mode === 'replace') window.history.replaceState(null, '', next);
      else window.history.pushState(null, '', next);
    }
    setRoute(parseRoute(next) as MyRoute);
  }, []);

  useEffect(() => {
    document.title = route.page === 'lab' ? 'Chess Lab' : 'My Games · Chess Lab';
  }, [route.page]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="app">
      <div className="sticky-nav">
        <header className="top">
          <div>
            <h1>Chess Lab</h1>
            <p className="who">{PLAYER}</p>
          </div>
          <nav className="site-nav" aria-label="Site">
            <a href="#rating" aria-current={route.page === 'lab' ? 'page' : undefined}>
              Rating
            </a>
            <a href="#mygames" aria-current={route.page === 'lab' ? undefined : 'page'}>
              My Games
            </a>
          </nav>
        </header>
        {route.page !== 'lab' ? <MyGamesNav route={route} /> : null}
      </div>

      {route.page === 'lab' ? <Lab /> : <MyGames route={route} go={go} />}

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
