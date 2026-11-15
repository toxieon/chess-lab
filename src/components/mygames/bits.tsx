/**
 * Chess Lab — small My Games status bits.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { formatUpdated } from '../../mygames/format.mjs';

export function Updated({ iso }: { iso: string }) {
  return (
    <p className="muted" data-testid="updated">
      {formatUpdated(iso) as string}
    </p>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p className="banner" role="alert">
      {message}{' '}
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

export function Loading({ children }: { children: string }) {
  return (
    <p className="status" role="status">
      {children}
    </p>
  );
}
