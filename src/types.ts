/**
 * Chess Lab — shared types.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type Classification = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type Outcome = {
  kind: 'win' | 'loss' | 'draw';
  reason: string;
};

export type Game = {
  id: string;
  url: string;
  endTime: number;
  timeClass: string;
  pgn: string;
  monthKey: string;
  playerColor: 'w' | 'b';
  playerRating: number | null;
  opponent: string;
  opponentRating: number | null;
  outcome: Outcome;
};

export type PositionEval = {
  whiteCp: number;
  mate: number | null;
};

export type MoveAnnotation = {
  ply: number;
  classification: Classification;
  cpl: number;
  bestUci: string | null;
  bestSan: string | null;
};

export type GameAnalysis = {
  version: 1;
  gameId: string;
  depth: number;
  positions: PositionEval[];
  moves: MoveAnnotation[];
  counts: Record<Classification, number>;
};
