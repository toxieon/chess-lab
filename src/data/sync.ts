/**
 * Chess Lab — serial Chess.com archive sync.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Past months are stored and never requested again. The current month is
 * always replaced. Requests are queued so two callers cannot hit the API
 * at the same time.
 */

import { PLAYER } from '../config';
import {
  monthKey,
  monthsToFetch,
  normalizeGame,
  parseArchiveList,
  retryDelayMs,
  sortNewest,
} from '../lib/archives.mjs';
import type { Game, GameAnalysis } from '../types';
import { idbGet, idbGetAll, idbKeys, idbPut } from './db';

const ARCHIVES_URL = `https://api.chess.com/pub/player/${PLAYER}/games/archives`;

type ArchiveRow = { key: string; games: Game[]; savedAt: number };

let memory: Game[] | null = null;
let queue: Promise<void> = Promise.resolve();

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 429 || response.status >= 500) {
      if (attempt >= 5) {
        throw new Error(`Chess.com returned ${response.status}. Wait a moment and retry.`);
      }
      const delay = retryDelayMs(attempt, response.headers.get('Retry-After'));
      attempt += 1;
      await sleep(delay, signal);
      continue;
    }
    if (!response.ok) {
      const error = new Error(`Chess.com returned ${response.status}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('Chess.com returned an unexpected response.');
    }
  }
}

export async function loadCachedGames(): Promise<Game[]> {
  const rows = await idbGetAll<ArchiveRow>('archives');
  const games = sortNewest(rows.flatMap((row) => row?.games ?? [])) as Game[];
  memory = games;
  return games;
}

export async function cachedMonthKeys(): Promise<Set<string>> {
  return new Set(await idbKeys('archives'));
}

export async function saveMonth(key: string, games: Game[]): Promise<Game[]> {
  await idbPut('archives', { key, games, savedAt: Date.now() } satisfies ArchiveRow, key);
  const prev = memory ?? [];
  memory = sortNewest([...prev.filter((game) => game.monthKey !== key), ...games]) as Game[];
  return memory;
}

function gamesFromMonth(payload: unknown, key: string): Game[] {
  const rawGames = (payload as { games?: unknown[] } | null)?.games;
  if (!Array.isArray(rawGames)) return [];
  const games: Game[] = [];
  for (const raw of rawGames) {
    const game = normalizeGame(raw, PLAYER, key) as Game | null;
    if (game) games.push(game);
  }
  return games;
}

export type SyncHandlers = {
  signal?: AbortSignal;
  onGames: (games: Game[]) => void;
  onStatus: (status: string) => void;
};

export async function syncAll(handlers: SyncHandlers): Promise<void> {
  if (memory === null) {
    const cached = await loadCachedGames();
    if (!handlers.signal?.aborted) handlers.onGames(cached);
  } else if (!handlers.signal?.aborted) {
    handlers.onGames(memory);
  }
  if (handlers.signal?.aborted) return;

  handlers.onStatus(memory && memory.length > 0 ? 'Updating from Chess.com…' : 'Fetching games from Chess.com…');
  const payload = await fetchJson(ARCHIVES_URL, handlers.signal);
  const archives = parseArchiveList(payload) as Array<{
    year: number;
    month: number;
    url: string;
    key: string;
  }>;
  const keys = await cachedMonthKeys();
  const todo = (monthsToFetch(archives, keys, new Date()) as typeof archives).sort(
    (a, b) => b.year - a.year || b.month - a.month,
  );
  const failed: string[] = [];

  for (let index = 0; index < todo.length; index += 1) {
    if (handlers.signal?.aborted) return;
    const archive = todo[index];
    handlers.onStatus(`Loading ${archive.key} (${index + 1}/${todo.length})`);
    try {
      const body = await fetchJson(archive.url, handlers.signal);
      const games = await saveMonth(archive.key, gamesFromMonth(body, archive.key));
      if (!handlers.signal?.aborted) handlers.onGames(games);
    } catch (error) {
      if (handlers.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
      const status = (error as { status?: number }).status;
      if (status === 404) {
        const games = await saveMonth(archive.key, []);
        if (!handlers.signal?.aborted) handlers.onGames(games);
      } else {
        failed.push(archive.key);
      }
    }
    await sleep(120, handlers.signal);
  }

  if (!handlers.signal?.aborted) {
    const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const note = failed.length > 0 ? ` · ${failed.length} month${failed.length === 1 ? '' : 's'} failed` : '';
    handlers.onStatus(`Updated ${stamp}${note}`);
  }
}

export async function syncCurrentMonth(handlers: SyncHandlers): Promise<void> {
  if (memory === null) await loadCachedGames();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const key = monthKey(year, month);
  const url = `https://api.chess.com/pub/player/${PLAYER}/games/${year}/${String(month).padStart(2, '0')}`;
  handlers.onStatus('Checking for new games…');
  let body: unknown;
  try {
    body = await fetchJson(url, handlers.signal);
  } catch (error) {
    if ((error as { status?: number }).status === 404) body = { games: [] };
    else throw error;
  }
  const games = await saveMonth(key, gamesFromMonth(body, key));
  if (!handlers.signal?.aborted) {
    handlers.onGames(games);
    const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    handlers.onStatus(`Updated ${stamp}`);
  }
}

export function analysisKey(gameId: string, depth: number): string {
  return `${gameId}@d${depth}`;
}

export async function loadAnalysis(gameId: string, depth: number): Promise<GameAnalysis | null> {
  const row = await idbGet<GameAnalysis>('analysis', analysisKey(gameId, depth));
  if (!row || row.version !== 1 || row.depth !== depth) return null;
  return row;
}

export async function saveAnalysis(analysis: GameAnalysis): Promise<void> {
  await idbPut('analysis', analysis, analysisKey(analysis.gameId, analysis.depth));
}
