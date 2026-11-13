import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCurrentMonth,
  monthsToFetch,
  normalizeGame,
  outcomeForPlayer,
  outcomeLabel,
  parseArchiveList,
  retryDelayMs,
  sortNewest,
} from '../src/lib/archives.mjs';

const NOW = new Date(Date.UTC(2026, 10, 13, 12, 0, 0));

test('parseArchiveList reads year and month from archive URLs', () => {
  const parsed = parseArchiveList({
    archives: [
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2023/01',
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2026/11/',
      'not-an-archive',
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2024/13',
    ],
  });
  assert.deepEqual(
    parsed.map((item) => item.key),
    ['2023-01', '2026-11'],
  );
  assert.equal(parsed[0].year, 2023);
  assert.equal(parsed[0].month, 1);
});

test('past cached months are skipped and the current month is always fetched', () => {
  const archives = parseArchiveList({
    archives: [
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2023/01',
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2026/10',
      'https://api.chess.com/pub/player/brandonneillthegreat/games/2026/11',
    ],
  });
  assert.equal(isCurrentMonth(2026, 11, NOW), true);
  assert.equal(isCurrentMonth(2026, 10, NOW), false);
  const todo = monthsToFetch(archives, ['2023-01', '2026-11'], NOW);
  assert.deepEqual(
    todo.map((item) => item.key),
    ['2026-10', '2026-11'],
  );
});

test('429 backoff honours Retry-After and otherwise doubles', () => {
  assert.equal(retryDelayMs(0, null), 1000);
  assert.equal(retryDelayMs(1, undefined), 2000);
  assert.equal(retryDelayMs(3, ''), 8000);
  assert.equal(retryDelayMs(0, '3'), 3000);
  assert.equal(retryDelayMs(8, null), 30000);
});

test('results name the reason from the player and the opponent', () => {
  assert.deepEqual(outcomeForPlayer('win', 'resigned'), { kind: 'win', reason: 'resignation' });
  assert.equal(outcomeLabel(outcomeForPlayer('win', 'checkmated')), 'Win · checkmate');
  assert.equal(outcomeLabel(outcomeForPlayer('timeout', 'win')), 'Loss · timeout');
  assert.equal(outcomeLabel(outcomeForPlayer('stalemate', 'stalemate')), 'Draw · stalemate');
  assert.equal(outcomeLabel(outcomeForPlayer('repetition', 'repetition')), 'Draw · repetition');
  assert.equal(outcomeLabel(outcomeForPlayer('insufficient', 'insufficient')), 'Draw · insufficient material');
});

test('normalizeGame keeps standard chess for this username and sorts newest first', () => {
  const raw = {
    url: 'https://www.chess.com/game/live/1',
    uuid: 'game-1',
    pgn: '[Event "Live Chess"]\n\n1. e4 e5 1-0',
    end_time: 1_700_000_000,
    time_class: 'blitz',
    rules: 'chess',
    white: { username: 'BrandonNeillTheGreat', rating: 1512, result: 'win' },
    black: { username: 'opponent', rating: 1490, result: 'resigned' },
  };
  const game = normalizeGame(raw, 'brandonneillthegreat', '2023-11');
  assert.equal(game.id, 'game-1');
  assert.equal(game.playerColor, 'w');
  assert.equal(game.playerRating, 1512);
  assert.equal(game.opponent, 'opponent');
  assert.equal(game.opponentRating, 1490);
  assert.equal(game.timeClass, 'blitz');
  assert.equal(game.monthKey, '2023-11');
  assert.equal(game.outcome.kind, 'win');

  const asBlack = normalizeGame(
    {
      ...raw,
      uuid: 'game-2',
      end_time: 1_700_000_100,
      white: raw.black,
      black: { username: 'brandonneillthegreat', rating: 1600, result: 'checkmated' },
    },
    'brandonneillthegreat',
    '2023-11',
  );
  assert.equal(asBlack.playerColor, 'b');
  assert.equal(asBlack.outcome.kind, 'loss');
  assert.equal(asBlack.outcome.reason, 'checkmate');

  assert.equal(normalizeGame({ ...raw, rules: 'chess960' }, 'brandonneillthegreat', '2023-11'), null);
  assert.equal(normalizeGame({ ...raw, white: raw.black, black: raw.white }, 'someone-else', '2023-11'), null);

  const ordered = sortNewest([game, asBlack]);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ['game-2', 'game-1'],
  );
});
