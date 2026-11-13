/**
 * Chess Lab — Chess.com archive list parsing and game normalisation.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
]);

const REASON_TEXT = {
  win: 'win',
  checkmated: 'checkmate',
  resigned: 'resignation',
  timeout: 'timeout',
  abandoned: 'abandonment',
  agreed: 'agreement',
  repetition: 'repetition',
  stalemate: 'stalemate',
  insufficient: 'insufficient material',
  '50move': 'fifty-move rule',
  timevsinsufficient: 'timeout vs insufficient material',
  lose: 'loss',
};

export function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function isCurrentMonth(year, month, now = new Date()) {
  return year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
}

export function parseArchiveList(payload) {
  const urls = Array.isArray(payload?.archives) ? payload.archives : [];
  const archives = [];
  for (const url of urls) {
    if (typeof url !== 'string') continue;
    const match = url.match(/\/games\/(\d{4})\/(\d{2})\/?$/);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) continue;
    archives.push({ year, month, url, key: monthKey(year, month) });
  }
  return archives;
}

/** Past months are fetched once. The current month is always refetched. */
export function monthsToFetch(archives, cachedKeys, now = new Date()) {
  const cached = cachedKeys instanceof Set ? cachedKeys : new Set(cachedKeys);
  return archives.filter(
    (archive) => isCurrentMonth(archive.year, archive.month, now) || !cached.has(archive.key),
  );
}

export function retryDelayMs(attempt, retryAfter) {
  if (retryAfter != null && String(retryAfter).trim() !== '') {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(60_000, Math.max(0, seconds * 1000));
    const when = Date.parse(String(retryAfter));
    if (Number.isFinite(when)) return Math.min(60_000, Math.max(0, when - Date.now()));
  }
  return Math.min(30_000, 1000 * 2 ** attempt);
}

export function reasonText(code) {
  if (!code) return '';
  return REASON_TEXT[code] || String(code).replace(/_/g, ' ');
}

export function outcomeForPlayer(playerResult, opponentResult) {
  if (playerResult === 'win') {
    return { kind: 'win', reason: reasonText(opponentResult) };
  }
  if (DRAW_RESULTS.has(playerResult)) {
    return { kind: 'draw', reason: reasonText(playerResult) };
  }
  return { kind: 'loss', reason: reasonText(playerResult) };
}

export function outcomeLabel(outcome) {
  const kind = outcome.kind === 'win' ? 'Win' : outcome.kind === 'loss' ? 'Loss' : 'Draw';
  if (!outcome.reason || outcome.reason === 'win' || outcome.reason === 'loss') return kind;
  return `${kind} · ${outcome.reason}`;
}

export function sortNewest(games) {
  return [...games].sort((a, b) => b.endTime - a.endTime || String(b.id).localeCompare(String(a.id)));
}

/**
 * Turn one PubAPI game into the record the UI stores.
 * Non-standard rules and games that are not the player's are dropped.
 */
export function normalizeGame(raw, username, archiveKey = '') {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.rules && raw.rules !== 'chess') return null;
  if (typeof raw.pgn !== 'string' || raw.pgn.trim() === '') return null;

  const name = String(username || '').toLowerCase();
  const whiteName = String(raw.white?.username || '').toLowerCase();
  const blackName = String(raw.black?.username || '').toLowerCase();
  let playerColor = null;
  if (whiteName === name) playerColor = 'w';
  else if (blackName === name) playerColor = 'b';
  else return null;

  const playerSide = playerColor === 'w' ? raw.white : raw.black;
  const opponentSide = playerColor === 'w' ? raw.black : raw.white;
  const endTime = Number(raw.end_time);
  const id = String(raw.uuid || raw.url || `${endTime}:${whiteName}:${blackName}`);

  const rating = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    id,
    url: typeof raw.url === 'string' ? raw.url : '',
    endTime: Number.isFinite(endTime) ? endTime : 0,
    timeClass: typeof raw.time_class === 'string' && raw.time_class ? raw.time_class : 'unknown',
    pgn: raw.pgn,
    monthKey: archiveKey,
    playerColor,
    playerRating: rating(playerSide?.rating),
    opponent: String(opponentSide?.username || 'opponent'),
    opponentRating: rating(opponentSide?.rating),
    outcome: outcomeForPlayer(playerSide?.result, opponentSide?.result),
  };
}
