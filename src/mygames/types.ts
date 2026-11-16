/**
 * Chess Lab — types for the My Games export.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Field names match public/data/my-games/SCHEMA.md.
 */

export type Colour = 'white' | 'black';
export type GameResult = 'win' | 'draw' | 'loss';
export type Judgment = 'great' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type EvalScore = {
  cp?: number;
  mate?: number;
  winner?: Colour;
};

export type StoredMove = {
  ply: number;
  move_number: number;
  san: string;
  uci: string;
  colour: Colour;
  is_player_move: boolean;
  fen_before: string;
  fen_after: string;
  eval: EvalScore;
  eval_cp: number;
  eval_before: EvalScore | null;
  best_san: string | null;
  best_uci: string | null;
  second_san: string | null;
  loss_cp: number | null;
  gap_cp: number | null;
  judgment: Judgment | null;
  depth: number;
};

export type StoredGame = {
  id: string;
  url: string;
  date: string;
  end_melbourne: string;
  colour: Colour;
  opponent: string;
  ratings: { player: number; opponent: number };
  white: string;
  black: string;
  white_elo: number;
  black_elo: number;
  time_control: string;
  time_control_label: string;
  time_class: string;
  rated: boolean;
  result: GameResult;
  result_pgn: string;
  termination: string;
  pgn: string;
  opening: { eco: string; name: string; family: string; eco_url: string };
  plies: number;
  my_moves: number;
  best_move_count: number;
  best_move_pct: number;
  blunder_count: number;
  mistake_count: number;
  great_count: number;
  engine?: { name?: string; depth?: number };
  moves: StoredMove[];
};

export type GamesDocument = {
  generated_melbourne: string;
  player: string;
  player_url: string;
  months: string[];
  engine?: { name?: string; depth?: number };
  counts?: { games: number; puzzles: number; patterns: number };
  games: StoredGame[];
};

export type Puzzle = {
  id: string;
  source: {
    game_id: string;
    url: string;
    move_number: number;
    ply: number;
    colour: Colour;
    opponent: string;
    date: string;
  };
  fen: string;
  side_to_move: Colour;
  played: { san: string; uci: string };
  solution: { san: string[]; uci: string[] };
  eval_before: EvalScore;
  eval_after: EvalScore;
  eval_best: EvalScore;
  loss_cp: number;
  gap_cp: number;
  theme: string;
  hint: string;
  goal?: string | null;
  mate_in?: number | null;
  depth: number;
};

export type PuzzlesDocument = {
  generated_melbourne: string;
  player: string;
  count?: number;
  puzzles: Puzzle[];
};

export type Pattern = {
  id: string;
  theme: string;
  title: string;
  description: string;
  count: number;
  recurring: boolean;
  puzzle_ids: string[];
};

export type PatternsDocument = {
  generated_melbourne: string;
  player: string;
  count?: number;
  recurring_count?: number;
  patterns: Pattern[];
};

export type OpeningVariation = {
  name: string;
  eco: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
  score_pct: number;
  moves: string;
};

export type OpeningExample = {
  id: string;
  url: string;
  result: GameResult;
  date: string;
};

export type Opening = {
  name: string;
  variation: string | null;
  eco: string;
  eco_url: string;
  colour: Colour;
  moves: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
  score_pct: number;
  example_games: OpeningExample[];
  explanation: string;
  variations: OpeningVariation[];
};

export type OpeningsDocument = {
  generated_melbourne: string;
  player: string;
  as_white: Opening[];
  as_black: Opening[];
};

export type MyRoute =
  | { page: 'lab' }
  | { page: 'games' }
  | { page: 'game'; id: string; ply: number }
  | { page: 'puzzles' }
  | { page: 'puzzle'; id: string }
  | { page: 'patterns' }
  | { page: 'openings' };

export type PuzzleStatus = 'solved' | 'failed';
export type PuzzleProgress = Record<string, PuzzleStatus>;
