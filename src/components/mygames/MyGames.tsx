/**
 * Chess Lab — My Games section.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * games.json is loaded only for the game list and the game viewer.
 */

import { useLoad } from '../../mygames/load';
import type { GamesDocument, MyRoute, OpeningsDocument, PatternsDocument, PuzzlesDocument } from '../../mygames/types';
import { GameIndex } from './GameIndex';
import { LoadError, Loading } from './bits';
import { Openings } from './Openings';
import { Patterns } from './Patterns';
import { Puzzles } from './Puzzles';
import { Replay } from './Replay';

type Go = (hash: string, mode?: 'push' | 'replace') => void;
type SectionRoute = Exclude<MyRoute, { page: 'lab' }>;

export function MyGamesNav({ route }: { route: SectionRoute }) {
  const games = route.page === 'games' || route.page === 'game';
  const puzzles = route.page === 'puzzles' || route.page === 'puzzle';
  return (
    <nav className="subnav" aria-label="My Games">
      <a href="#mygames" aria-current={games ? 'page' : undefined}>
        Games
      </a>
      <a href="#puzzles" aria-current={puzzles ? 'page' : undefined}>
        Puzzles
      </a>
      <a href="#patterns" aria-current={route.page === 'patterns' ? 'page' : undefined}>
        Repeat offences
      </a>
      <a href="#openings" aria-current={route.page === 'openings' ? 'page' : undefined}>
        Openings
      </a>
    </nav>
  );
}

export function MyGames({ route, go }: { route: SectionRoute; go: Go }) {
  if (route.page === 'games' || route.page === 'game') return <GamesRoute route={route} />;
  if (route.page === 'puzzles' || route.page === 'puzzle') return <PuzzlesRoute route={route} go={go} />;
  if (route.page === 'patterns') return <PatternsRoute />;
  return <OpeningsRoute />;
}

function GamesRoute({ route }: { route: Extract<SectionRoute, { page: 'games' } | { page: 'game' }> }) {
  const { data, error, loading, retry } = useLoad<GamesDocument>('games.json');
  if (loading) return <Loading>Loading games…</Loading>;
  if (error || !data) return <LoadError message={error || 'games.json could not be loaded.'} onRetry={retry} />;
  if (route.page === 'game') {
    const game = data.games.find((item) => item.id === route.id);
    if (!game) {
      return (
        <p className="banner" role="alert">
          That game is not in this export. <a href="#mygames">Back to games</a>
        </p>
      );
    }
    return <Replay game={game} initialPly={route.ply} updated={data.generated_melbourne} />;
  }
  return <GameIndex games={data.games} updated={data.generated_melbourne} />;
}

function PuzzlesRoute({
  route,
  go,
}: {
  route: Extract<SectionRoute, { page: 'puzzles' } | { page: 'puzzle' }>;
  go: Go;
}) {
  const puzzles = useLoad<PuzzlesDocument>('puzzles.json');
  const patterns = useLoad<PatternsDocument>('patterns.json');
  if (puzzles.loading) return <Loading>Loading puzzles…</Loading>;
  if (puzzles.error || !puzzles.data) {
    return <LoadError message={puzzles.error || 'puzzles.json could not be loaded.'} onRetry={puzzles.retry} />;
  }
  return (
    <Puzzles
      route={route}
      go={go}
      puzzles={puzzles.data.puzzles}
      patterns={patterns.data?.patterns ?? []}
      updated={puzzles.data.generated_melbourne}
    />
  );
}

function PatternsRoute() {
  const patterns = useLoad<PatternsDocument>('patterns.json');
  const puzzles = useLoad<PuzzlesDocument>('puzzles.json');
  if (patterns.loading) return <Loading>Loading repeat offences…</Loading>;
  if (patterns.error || !patterns.data) {
    return <LoadError message={patterns.error || 'patterns.json could not be loaded.'} onRetry={patterns.retry} />;
  }
  return (
    <Patterns
      patterns={patterns.data.patterns}
      puzzles={puzzles.data?.puzzles ?? []}
      updated={patterns.data.generated_melbourne}
    />
  );
}

function OpeningsRoute() {
  const { data, error, loading, retry } = useLoad<OpeningsDocument>('openings.json');
  if (loading) return <Loading>Loading openings…</Loading>;
  if (error || !data) return <LoadError message={error || 'openings.json could not be loaded.'} onRetry={retry} />;
  return <Openings asWhite={data.as_white} asBlack={data.as_black} updated={data.generated_melbourne} />;
}
