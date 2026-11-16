/**
 * Chess Lab — load My Games JSON at runtime.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The files live in public/data/my-games and are replaced on main by a nightly
 * push. They are fetched, not imported, so a data-only deploy is picked up
 * without rebuilding the logic. cache: 'no-cache' revalidates on each visit.
 * The generated_melbourne value is inside the file, so it cannot be a query
 * key until after the download.
 */

import { useEffect, useState } from 'react';
import {
  parseGamesDocument,
  parseOpeningsDocument,
  parsePatternsDocument,
  parsePuzzlesDocument,
} from './parse.mjs';

export type DataName = 'games.json' | 'puzzles.json' | 'patterns.json' | 'openings.json';

const parsers: Record<DataName, (data: unknown) => unknown> = {
  'games.json': parseGamesDocument,
  'puzzles.json': parsePuzzlesDocument,
  'patterns.json': parsePatternsDocument,
  'openings.json': parseOpeningsDocument,
};

const resolved = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function peekDocument(name: DataName): unknown {
  return resolved.get(name) ?? null;
}

export function clearDocument(name: DataName) {
  resolved.delete(name);
  inflight.delete(name);
}

export function loadDocument(name: DataName): Promise<unknown> {
  const cached = resolved.get(name);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(name);
  if (pending) return pending;
  const promise = fetchDocument(name)
    .then((data) => {
      resolved.set(name, data);
      inflight.delete(name);
      return data;
    })
    .catch((error: unknown) => {
      inflight.delete(name);
      throw error;
    });
  inflight.set(name, promise);
  return promise;
}

async function fetchDocument(name: DataName): Promise<unknown> {
  const base = import.meta.env.BASE_URL || './';
  const url = `${base}data/my-games/${name}`;
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new Error(`${name} could not be downloaded.`);
  }
  if (!response.ok) {
    throw new Error(`${name} is not available (${response.status}).`);
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error(`${name} is not valid JSON.`);
  }
  return parsers[name](json);
}

export function useLoad<T>(name: DataName): {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<T | null>(() => (peekDocument(name) as T | null) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => peekDocument(name) == null);

  useEffect(() => {
    const cached = peekDocument(name) as T | null;
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    setError(null);
    loadDocument(name).then(
      (value) => {
        if (cancel) return;
        setData(value as T);
        setLoading(false);
      },
      (caught: unknown) => {
        if (cancel) return;
        setData(null);
        setError(caught instanceof Error ? caught.message : `${name} could not be loaded.`);
        setLoading(false);
      },
    );
    return () => {
      cancel = true;
    };
  }, [name, attempt]);

  return {
    data,
    error,
    loading,
    retry: () => {
      clearDocument(name);
      setData(null);
      setError(null);
      setLoading(true);
      setAttempt((value) => value + 1);
    },
  };
}
