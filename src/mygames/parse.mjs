/**
 * Chess Lab — validate the My Games JSON export.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Returns the same object when it matches the schema. Evals are not copied or changed.
 */

const JUDGMENTS = new Set(['great', 'best', 'good', 'inaccuracy', 'mistake', 'blunder']);
const COLOURS = new Set(['white', 'black']);
const RESULTS = new Set(['win', 'draw', 'loss']);
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

function fail(file, message) {
  throw new Error(`${file} ${message}`);
}

function asObject(data, file) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(file, 'is not an object.');
  return data;
}

function reqString(file, value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(file, `is missing ${label}.`);
}

function reqInt(file, value, label) {
  if (typeof value !== 'number' || !Number.isInteger(value)) fail(file, `has an invalid ${label}.`);
}

function reqNumber(file, value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(file, `has an invalid ${label}.`);
}

function optString(file, value, label) {
  if (value != null && typeof value !== 'string') fail(file, `has an invalid ${label}.`);
}

function isEval(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const cpOk = value.cp === undefined || (typeof value.cp === 'number' && Number.isFinite(value.cp));
  const mateOk = value.mate === undefined || (typeof value.mate === 'number' && Number.isInteger(value.mate));
  const hasScore = typeof value.cp === 'number' || typeof value.mate === 'number';
  const winnerOk = value.winner === undefined || value.winner === 'white' || value.winner === 'black';
  return cpOk && mateOk && hasScore && winnerOk;
}

function reqEval(file, value, label) {
  if (!isEval(value)) fail(file, `has an invalid ${label}.`);
}

function reqTimestamp(file, data) {
  reqString(file, data.generated_melbourne, 'generated_melbourne');
}

export function parseGamesDocument(data) {
  const file = 'games.json';
  const doc = asObject(data, file);
  reqTimestamp(file, doc);
  if (!Array.isArray(doc.games)) fail(file, 'is missing games.');
  doc.games.forEach((game, index) => {
    if (!game || typeof game !== 'object') fail(file, `game ${index} is not an object.`);
    reqString(file, game.id, `games[${index}].id`);
    reqString(file, game.date, `games[${index}].date`);
    reqString(file, game.opponent, `games[${index}].opponent`);
    if (!COLOURS.has(game.colour)) fail(file, `games[${index}].colour is invalid.`);
    if (!RESULTS.has(game.result)) fail(file, `games[${index}].result is invalid.`);
    if (!game.opening || typeof game.opening !== 'object') fail(file, `games[${index}] is missing opening.`);
    reqString(file, game.opening.name, `games[${index}].opening.name`);
    reqString(file, game.opening.family, `games[${index}].opening.family`);
    reqString(file, game.opening.eco, `games[${index}].opening.eco`);
    if (!Array.isArray(game.moves)) fail(file, `games[${index}] is missing moves.`);
    game.moves.forEach((move, moveIndex) => {
      const at = `games[${index}].moves[${moveIndex}]`;
      if (!move || typeof move !== 'object') fail(file, `${at} is not an object.`);
      reqInt(file, move.ply, `${at}.ply`);
      reqInt(file, move.move_number, `${at}.move_number`);
      reqString(file, move.san, `${at}.san`);
      reqString(file, move.uci, `${at}.uci`);
      if (!COLOURS.has(move.colour)) fail(file, `${at}.colour is invalid.`);
      if (typeof move.is_player_move !== 'boolean') fail(file, `${at}.is_player_move is invalid.`);
      reqString(file, move.fen_before, `${at}.fen_before`);
      reqString(file, move.fen_after, `${at}.fen_after`);
      reqEval(file, move.eval, `${at}.eval`);
      reqInt(file, move.eval_cp, `${at}.eval_cp`);
      if (move.eval_before != null && !isEval(move.eval_before)) fail(file, `${at}.eval_before is invalid.`);
      optString(file, move.best_uci, `${at}.best_uci`);
      optString(file, move.best_san, `${at}.best_san`);
      if (move.best_uci != null && !UCI.test(move.best_uci)) fail(file, `${at}.best_uci is invalid.`);
      if (move.judgment != null && !JUDGMENTS.has(move.judgment)) fail(file, `${at}.judgment is invalid.`);
      if (move.loss_cp != null && (typeof move.loss_cp !== 'number' || !Number.isInteger(move.loss_cp))) {
        fail(file, `${at}.loss_cp is invalid.`);
      }
    });
  });
  return doc;
}

export function parsePuzzlesDocument(data) {
  const file = 'puzzles.json';
  const doc = asObject(data, file);
  reqTimestamp(file, doc);
  if (!Array.isArray(doc.puzzles)) fail(file, 'is missing puzzles.');
  const seen = new Set();
  doc.puzzles.forEach((puzzle, index) => {
    const at = `puzzles[${index}]`;
    if (!puzzle || typeof puzzle !== 'object') fail(file, `${at} is not an object.`);
    reqString(file, puzzle.id, `${at}.id`);
    if (seen.has(puzzle.id)) fail(file, `has a duplicate puzzle id ${puzzle.id}.`);
    seen.add(puzzle.id);
    reqString(file, puzzle.fen, `${at}.fen`);
    if (!COLOURS.has(puzzle.side_to_move)) fail(file, `${at}.side_to_move is invalid.`);
    reqString(file, puzzle.theme, `${at}.theme`);
    reqString(file, puzzle.hint, `${at}.hint`);
    if (!puzzle.played || typeof puzzle.played !== 'object') fail(file, `${at} is missing played.`);
    reqString(file, puzzle.played.uci, `${at}.played.uci`);
    reqString(file, puzzle.played.san, `${at}.played.san`);
    if (!puzzle.solution || typeof puzzle.solution !== 'object') fail(file, `${at} is missing solution.`);
    if (!Array.isArray(puzzle.solution.uci) || !Array.isArray(puzzle.solution.san)) {
      fail(file, `${at}.solution is missing uci and san.`);
    }
    if (puzzle.solution.uci.length === 0 || puzzle.solution.uci.length !== puzzle.solution.san.length) {
      fail(file, `${at}.solution uci and san lists do not match.`);
    }
    puzzle.solution.uci.forEach((uci, step) => {
      if (typeof uci !== 'string' || !UCI.test(uci)) fail(file, `${at}.solution.uci[${step}] is invalid.`);
      if (typeof puzzle.solution.san[step] !== 'string' || puzzle.solution.san[step].length === 0) {
        fail(file, `${at}.solution.san[${step}] is invalid.`);
      }
    });
    if (!puzzle.source || typeof puzzle.source !== 'object') fail(file, `${at} is missing source.`);
    reqString(file, puzzle.source.game_id, `${at}.source.game_id`);
    reqInt(file, puzzle.source.ply, `${at}.source.ply`);
    reqInt(file, puzzle.source.move_number, `${at}.source.move_number`);
    reqString(file, puzzle.source.opponent, `${at}.source.opponent`);
    reqEval(file, puzzle.eval_before, `${at}.eval_before`);
    reqEval(file, puzzle.eval_after, `${at}.eval_after`);
    reqEval(file, puzzle.eval_best, `${at}.eval_best`);
  });
  return doc;
}

export function parsePatternsDocument(data) {
  const file = 'patterns.json';
  const doc = asObject(data, file);
  reqTimestamp(file, doc);
  if (!Array.isArray(doc.patterns)) fail(file, 'is missing patterns.');
  doc.patterns.forEach((pattern, index) => {
    const at = `patterns[${index}]`;
    if (!pattern || typeof pattern !== 'object') fail(file, `${at} is not an object.`);
    reqString(file, pattern.id, `${at}.id`);
    reqString(file, pattern.theme, `${at}.theme`);
    reqString(file, pattern.title, `${at}.title`);
    reqString(file, pattern.description, `${at}.description`);
    reqInt(file, pattern.count, `${at}.count`);
    if (typeof pattern.recurring !== 'boolean') fail(file, `${at}.recurring is invalid.`);
    if (!Array.isArray(pattern.puzzle_ids) || pattern.puzzle_ids.some((id) => typeof id !== 'string' || !id)) {
      fail(file, `${at}.puzzle_ids is invalid.`);
    }
  });
  return doc;
}

function checkOpening(file, opening, at) {
  if (!opening || typeof opening !== 'object') fail(file, `${at} is not an object.`);
  reqString(file, opening.name, `${at}.name`);
  reqString(file, opening.eco, `${at}.eco`);
  if (!COLOURS.has(opening.colour)) fail(file, `${at}.colour is invalid.`);
  if (typeof opening.moves !== 'string') fail(file, `${at}.moves is invalid.`);
  reqString(file, opening.explanation, `${at}.explanation`);
  reqInt(file, opening.games, `${at}.games`);
  reqInt(file, opening.win, `${at}.win`);
  reqInt(file, opening.draw, `${at}.draw`);
  reqInt(file, opening.loss, `${at}.loss`);
  reqNumber(file, opening.score_pct, `${at}.score_pct`);
  if (opening.variation != null && typeof opening.variation !== 'string') fail(file, `${at}.variation is invalid.`);
  if (!Array.isArray(opening.variations)) fail(file, `${at}.variations is invalid.`);
  opening.variations.forEach((variation, index) => {
    const where = `${at}.variations[${index}]`;
    if (!variation || typeof variation !== 'object') fail(file, `${where} is not an object.`);
    reqString(file, variation.name, `${where}.name`);
    reqString(file, variation.eco, `${where}.eco`);
    if (typeof variation.moves !== 'string') fail(file, `${where}.moves is invalid.`);
    reqInt(file, variation.games, `${where}.games`);
    reqInt(file, variation.win, `${where}.win`);
    reqInt(file, variation.draw, `${where}.draw`);
    reqInt(file, variation.loss, `${where}.loss`);
    reqNumber(file, variation.score_pct, `${where}.score_pct`);
  });
  if (!Array.isArray(opening.example_games)) fail(file, `${at}.example_games is invalid.`);
  opening.example_games.forEach((example, index) => {
    const where = `${at}.example_games[${index}]`;
    if (!example || typeof example !== 'object') fail(file, `${where} is not an object.`);
    reqString(file, example.id, `${where}.id`);
    if (!RESULTS.has(example.result)) fail(file, `${where}.result is invalid.`);
  });
}

export function parseOpeningsDocument(data) {
  const file = 'openings.json';
  const doc = asObject(data, file);
  reqTimestamp(file, doc);
  if (!Array.isArray(doc.as_white) || !Array.isArray(doc.as_black)) {
    fail(file, 'is missing as_white or as_black.');
  }
  doc.as_white.forEach((opening, index) => checkOpening(file, opening, `as_white[${index}]`));
  doc.as_black.forEach((opening, index) => checkOpening(file, opening, `as_black[${index}]`));
  return doc;
}

export function sortPatterns(patterns) {
  return [...patterns].sort((a, b) => b.count - a.count || String(a.title).localeCompare(String(b.title)));
}
