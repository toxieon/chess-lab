/**
 * Single-threaded UCI session over one Web Worker.
 *
 * Adapted from Chesskit `src/lib/engine/worker.ts` (`sendCommandsToWorker`).
 * Copyright (C) GuillaumeSD and Chesskit contributors.
 * https://github.com/GuillaumeSD/Chesskit/blob/main/src/lib/engine/worker.ts
 * Licensed under the GNU Affero General Public License, version 3.
 *
 * The original waits until a worker message starts with a final prefix,
 * then resolves the collected lines. The multi-worker pool is not used:
 * GitHub Pages cannot send COOP/COEP, so this app keeps one classic Worker
 * pointed at the unmodified Stockfish lite-single build in public/.
 */

export type SendOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onLine?: (line: string) => void;
};

export function sendCommands(
  worker: Worker,
  commands: string[],
  finalPrefix: string,
  options: SendOptions = {},
): Promise<string[]> {
  const { signal, timeoutMs = 60_000, onLine } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }

    const lines: string[] = [];
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onMessage = (event: MessageEvent) => {
      const text = typeof event.data === 'string' ? event.data : '';
      if (!text) return;
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        lines.push(line);
        onLine?.(line);
        if (line.startsWith(finalPrefix)) {
          finish(() => resolve(lines));
          return;
        }
      }
    };

    const onError = (event: ErrorEvent) => {
      finish(() => reject(new Error(event.message || 'Stockfish worker error')));
    };

    const onAbort = () => {
      try {
        worker.postMessage('stop');
      } catch {
        /* worker may already be gone */
      }
      finish(() => reject(new DOMException('aborted', 'AbortError')));
    };

    const timer = setTimeout(() => {
      try {
        worker.postMessage('stop');
      } catch {
        /* ignore */
      }
      finish(() => reject(new Error('Stockfish timed out')));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      for (const command of commands) worker.postMessage(command);
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

let workerPromise: Promise<Worker> | null = null;
let currentWorker: Worker | null = null;

export function stockfishWorkerUrl(): string {
  const base = import.meta.env.BASE_URL || './';
  return new URL(`${base}vendor/stockfish/stockfish-18-lite-single.js`, window.location.href).toString();
}

async function bootWorker(): Promise<Worker> {
  const worker = new Worker(stockfishWorkerUrl());
  currentWorker = worker;
  try {
    await sendCommands(worker, ['uci'], 'uciok', { timeoutMs: 30_000 });
    try {
      await sendCommands(
        worker,
        ['setoption name Threads value 1', 'setoption name Hash value 16', 'isready'],
        'readyok',
        { timeoutMs: 15_000 },
      );
    } catch {
      await sendCommands(worker, ['isready'], 'readyok', { timeoutMs: 15_000 });
    }
    await sendCommands(worker, ['ucinewgame', 'isready'], 'readyok', { timeoutMs: 15_000 });
    return worker;
  } catch (error) {
    worker.terminate();
    if (currentWorker === worker) currentWorker = null;
    throw error;
  }
}

export function getEngine(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = bootWorker().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export function resetEngine(): void {
  const worker = currentWorker;
  workerPromise = null;
  currentWorker = null;
  if (!worker) return;
  try {
    worker.postMessage('stop');
    worker.postMessage('quit');
  } catch {
    /* ignore */
  }
  worker.terminate();
}
