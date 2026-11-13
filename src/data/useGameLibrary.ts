/**
 * Chess Lab — load cached games, then refresh Chess.com serially.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useCallback, useEffect, useState } from 'react';
import { POLL_MS } from '../config';
import type { Game } from '../types';
import { enqueue, syncAll, syncCurrentMonth } from './sync';

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useGameLibrary() {
  const [games, setGames] = useState<Game[]>([]);
  const [status, setStatus] = useState('Loading saved games…');
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const handlers = {
      signal: controller.signal,
      onGames: (next: Game[]) => {
        if (!controller.signal.aborted) setGames(next);
      },
      onStatus: (next: string) => {
        if (!controller.signal.aborted) setStatus(next);
      },
    };
    const fail = (caught: unknown) => {
      if (controller.signal.aborted || isAbort(caught)) return;
      setError(caught instanceof Error ? caught.message : 'Could not reach Chess.com');
    };

    enqueue(() => syncAll(handlers)).catch(fail);

    const timer = window.setInterval(() => {
      enqueue(() => syncCurrentMonth(handlers)).catch(fail);
    }, POLL_MS);

    let lastVisible = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisible < 60_000) return;
      lastVisible = now;
      enqueue(() => syncCurrentMonth(handlers)).catch(fail);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const refresh = useCallback(() => {
    setError(null);
    setReload((value) => value + 1);
  }, []);

  return { games, status, error, refresh };
}
