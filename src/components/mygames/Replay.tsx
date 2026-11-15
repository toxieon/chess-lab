/**
 * Chess Lab — replay one exported game.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Positions come from the stored FENs. The best-move arrow is the stored
 * best_uci. Judgement symbols are the stored judgment field.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { arrowSquares, normalizeUci } from '../../mygames/puzzle.mjs';
import { colourLabel, formatMelbourne, judgmentLabel, judgmentSymbol, resultLabel } from '../../mygames/format.mjs';
import type { StoredGame, StoredMove } from '../../mygames/types';
import { BOARD_LOOK } from './board';
import { EvalGraph } from './EvalGraph';
import { Updated } from './bits';
import { useBoardWidth } from './useBoardWidth';

function motionMs(ms: number): number {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
  return ms;
}

function bestText(move: StoredMove): string {
  if (move.best_san) return move.best_san;
  const squares = arrowSquares(move.best_uci) as { from: string; to: string } | null;
  return squares ? `${squares.from}-${squares.to}` : '';
}

export function Replay({ game, initialPly, updated }: { game: StoredGame; initialPly: number; updated: string }) {
  const max = game.moves.length;
  const clampedStart = Math.max(0, Math.min(max, initialPly));
  const [ply, setPly] = useState(clampedStart);
  const [animMs, setAnimMs] = useState(0);
  const plyRef = useRef(clampedStart);
  const lockRef = useRef<number | null>(null);
  const { ref, width } = useBoardWidth();

  useEffect(() => {
    const next = Math.max(0, Math.min(game.moves.length, initialPly));
    plyRef.current = next;
    setPly(next);
    setAnimMs(0);
    if (lockRef.current != null) {
      window.clearTimeout(lockRef.current);
      lockRef.current = null;
    }
  }, [game.id, game.moves.length, initialPly]);

  function jump(next: number) {
    if (lockRef.current != null) {
      window.clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const clamped = Math.max(0, Math.min(max, next));
    plyRef.current = clamped;
    setAnimMs(0);
    setPly(clamped);
  }

  function step(delta: number) {
    if (lockRef.current != null) return;
    const next = Math.max(0, Math.min(max, plyRef.current + delta));
    if (next === plyRef.current) return;
    const ms = motionMs(250);
    setAnimMs(ms);
    plyRef.current = next;
    setPly(next);
    if (ms > 0) {
      lockRef.current = window.setTimeout(() => {
        lockRef.current = null;
      }, ms);
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        jump(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        jump(max);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.move-btn.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [ply]);

  const move = ply > 0 ? game.moves[ply - 1] : null;
  const startFen = game.moves[0]?.fen_before || 'start';
  const fen = move?.fen_after || startFen;
  const symbol = move ? (judgmentSymbol(move.judgment) as string) : '';
  const showBest = Boolean(
    move?.is_player_move && move.best_uci && normalizeUci(move.best_uci) !== normalizeUci(move.uci),
  );

  const arrows = useMemo(() => {
    if (!showBest || !move?.best_uci) return [];
    const squares = arrowSquares(move.best_uci) as { from: string; to: string } | null;
    if (!squares) return [];
    return [[squares.from as Square, squares.to as Square, '#3dd68c']] as [Square, Square, string][];
  }, [showBest, move]);

  const rows = useMemo(() => {
    const built: Array<{ n: number; white: StoredMove; black: StoredMove | null }> = [];
    for (let index = 0; index < game.moves.length; index += 2) {
      const white = game.moves[index];
      if (!white) continue;
      built.push({ n: white.move_number, white, black: game.moves[index + 1] ?? null });
    }
    return built;
  }, [game.moves]);

  const names =
    game.colour === 'white'
      ? { opp: game.black, youElo: game.white_elo, oppElo: game.black_elo }
      : { opp: game.white, youElo: game.black_elo, oppElo: game.white_elo };

  return (
    <section className="viewer" data-testid="replay">
      <Updated iso={updated} />
      <div className="viewer-bar">
        <a className="back" href="#mygames">
          Games
        </a>
        <div className="viewer-title">
          <strong>vs {game.opponent}</strong>
          <span>
            {formatMelbourne(game.date) as string} · {colourLabel(game.colour) as string} · {resultLabel(game.result) as string}
            {game.time_control_label ? ` · ${game.time_control_label}` : ''}
          </span>
        </div>
      </div>
      <p className="opening-name">
        {game.opening.name} <span className="muted">{game.opening.eco}</span>
      </p>
      {game.termination ? <p className="muted">{game.termination}</p> : null}

      <div className="players">
        <span>
          {names.opp} · {colourLabel(game.colour === 'white' ? 'black' : 'white') as string}
        </span>
        <span className="rating-mini">{names.oppElo}</span>
      </div>
      <div className="board-row">
        <div className="board-slot" ref={ref} data-testid="replay-board">
          <Chessboard
            key={game.id}
            id="my-game-board"
            position={fen}
            boardWidth={width}
            boardOrientation={game.colour}
            arePiecesDraggable={false}
            animationDuration={animMs}
            customArrows={arrows}
            {...BOARD_LOOK}
          />
        </div>
      </div>
      <div className="players">
        <span>You · {colourLabel(game.colour) as string}</span>
        <span className="rating-mini">{names.youElo}</span>
      </div>

      {move && (symbol || showBest) ? (
        <p className={`missed ${move.judgment || ''}`} data-testid={showBest ? 'best-move' : undefined}>
          {symbol ? `${symbol} ${judgmentLabel(move.judgment) as string}` : null}
          {showBest ? `${symbol ? ' · ' : ''}Best was ${bestText(move)}` : null}
          {move.loss_cp != null && (move.judgment === 'blunder' || move.judgment === 'mistake')
            ? ` · ${move.loss_cp} cp`
            : null}
        </p>
      ) : null}

      <div className="transport" aria-label="Move navigation">
        <button type="button" onClick={() => jump(0)} aria-label="Start">
          |&lt;
        </button>
        <button type="button" onClick={() => step(-1)} aria-label="Previous move">
          &lt;
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Next move">
          &gt;
        </button>
        <button type="button" onClick={() => jump(max)} aria-label="End">
          &gt;|
        </button>
        <span className="ply" data-testid="ply">
          {ply}/{max}
        </span>
      </div>
      <p className="hint">Arrow keys step. Home and End jump.</p>

      <EvalGraph moves={game.moves} ply={ply} onJump={jump} />
      {game.engine?.name ? (
        <p className="hint">
          Stored eval · {game.engine.name}
          {game.engine.depth ? ` · depth ${game.engine.depth}` : ''}
        </p>
      ) : null}
      <p className="summary">
        <span className="c-blunder">{game.blunder_count} blunders</span>
        <span className="c-mistake">{game.mistake_count} mistakes</span>
        <span className="c-best">{game.great_count} great</span>
      </p>

      <div className="moves" aria-label="Move list" ref={listRef} data-testid="move-list">
        {rows.map((row) => (
          <div className="move-row" key={row.n}>
            <span className="mn">{row.n}.</span>
            <MoveButton move={row.white} active={ply === row.white.ply} onClick={() => jump(row.white.ply)} />
            {row.black ? (
              <MoveButton
                move={row.black}
                active={ply === row.black.ply}
                onClick={() => {
                  if (row.black) jump(row.black.ply);
                }}
              />
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
      {game.url ? (
        <p className="external">
          <a href={game.url} target="_blank" rel="noreferrer">
            Open on Chess.com
          </a>
        </p>
      ) : null}
    </section>
  );
}

function MoveButton({ move, active, onClick }: { move: StoredMove; active: boolean; onClick: () => void }) {
  const symbol = judgmentSymbol(move.judgment) as string;
  const label = judgmentLabel(move.judgment) as string;
  return (
    <button
      type="button"
      className={`move-btn${active ? ' on' : ''}`}
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
      data-judgment={move.judgment ?? undefined}
    >
      {move.san}
      {symbol ? (
        <span className={`sym ${move.judgment}`} aria-label={label}>
          {symbol}
        </span>
      ) : null}
    </button>
  );
}
