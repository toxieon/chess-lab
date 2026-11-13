/**
 * Chess Lab — animated board, move list, and Stockfish review.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Piece animation comes from react-chessboard. Best-move arrows are shown
 * for inaccuracies, mistakes, and blunders, matching the review behaviour
 * of Chesskit's board (that component is not copied).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { DEFAULT_DEPTH } from '../config';
import { analyseGame } from '../engine/analyse';
import { resetEngine } from '../engine/uciSession';
import { colorName, formatResult, formatWhen } from '../format';
import { readGame } from '../lib/moves.mjs';
import type { Classification, Game, GameAnalysis, PositionEval } from '../types';
import { loadAnalysis, saveAnalysis } from '../data/sync';
import { EvalBar } from './EvalBar';

const ARROW_FOR = new Set<Classification>(['inaccuracy', 'mistake', 'blunder']);
const CLASS_LABEL: Record<Classification, string> = {
  best: 'Best',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
};

function readDepth(): number {
  try {
    const value = Number(localStorage.getItem('chesslab.depth'));
    if (Number.isInteger(value) && value >= 8 && value <= 16) return value;
  } catch {
    /* private mode */
  }
  return DEFAULT_DEPTH;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function GameViewer({ game, onBack }: { game: Game; onBack: () => void }) {
  const parsed = useMemo(() => {
    try {
      return { replay: readGame(game.pgn) as { fens: string[]; moves: Array<{ san: string; color: 'w' | 'b'; uci: string }> }, error: null };
    } catch (error) {
      return { replay: null, error: error instanceof Error ? error.message : 'Could not read this game' };
    }
  }, [game.pgn]);

  const replay = parsed.replay;
  const maxPly = replay ? replay.fens.length - 1 : 0;
  const [ply, setPly] = useState(0);
  const [animMs, setAnimMs] = useState(200);
  const [depth, setDepth] = useState(readDepth);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [live, setLive] = useState<Array<PositionEval | null> | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const plyRef = useRef(0);
  const lockRef = useRef<number | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(300);
  const runRef = useRef<AbortController | null>(null);

  useEffect(() => {
    plyRef.current = 0;
    setPly(0);
    setAnimMs(0);
    setAnalysis(null);
    setLive(null);
    setProgress(null);
    setEngineError(null);
    runRef.current?.abort();
    setRunning(false);
  }, [game.id]);

  useEffect(() => {
    let cancel = false;
    loadAnalysis(game.id, depth).then((saved) => {
      if (!cancel) setAnalysis(saved);
    });
    return () => {
      cancel = true;
    };
  }, [game.id, depth]);

  useEffect(() => {
    const element = slotRef.current;
    if (!element) return;
    const apply = () => setBoardWidth(Math.max(220, Math.floor(element.clientWidth)));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [replay]);

  useEffect(() => {
    return () => {
      runRef.current?.abort();
    };
  }, []);

  function jump(next: number) {
    if (lockRef.current != null) {
      window.clearTimeout(lockRef.current);
      lockRef.current = null;
    }
    const clamped = Math.max(0, Math.min(maxPly, next));
    plyRef.current = clamped;
    setAnimMs(0);
    setPly(clamped);
  }

  function step(delta: number) {
    if (lockRef.current != null) return;
    const next = Math.max(0, Math.min(maxPly, plyRef.current + delta));
    if (next === plyRef.current) return;
    setAnimMs(prefersReducedMotion() ? 0 : 200);
    plyRef.current = next;
    setPly(next);
    lockRef.current = window.setTimeout(() => {
      lockRef.current = null;
    }, prefersReducedMotion() ? 0 : 200);
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
        jump(maxPly);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const current = document.querySelector('.move-btn.on');
    current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [ply]);

  async function startAnalysis() {
    if (!replay || running) return;
    runRef.current?.abort();
    const controller = new AbortController();
    runRef.current = controller;
    setRunning(true);
    setEngineError(null);
    setProgress({ done: 0, total: replay.fens.length });
    setLive(replay.fens.map(() => null));
    try {
      const result = await analyseGame({
        gameId: game.id,
        pgn: game.pgn,
        playerColor: game.playerColor,
        depth,
        signal: controller.signal,
        onProgress: (update) => {
          if (controller.signal.aborted) return;
          setProgress({ done: update.done, total: update.total });
          setLive(update.positions);
        },
      });
      if (controller.signal.aborted) return;
      await saveAnalysis(result);
      setAnalysis(result);
      setLive(null);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setEngineError(error instanceof Error ? error.message : 'Analysis failed');
      resetEngine();
    } finally {
      if (runRef.current === controller) setRunning(false);
    }
  }

  function stopAnalysis() {
    runRef.current?.abort();
    setRunning(false);
  }

  function changeDepth(value: number) {
    const next = Math.max(8, Math.min(16, value));
    setDepth(next);
    try {
      localStorage.setItem('chesslab.depth', String(next));
    } catch {
      /* ignore */
    }
  }

  const annotations = useMemo(() => {
    const map = new Map<number, GameAnalysis['moves'][number]>();
    for (const move of analysis?.moves ?? []) map.set(move.ply, move);
    return map;
  }, [analysis]);

  const position = analysis?.positions[ply] ?? live?.[ply] ?? null;
  const played = replay && ply > 0 ? replay.moves[ply - 1] : null;
  const note = annotations.get(ply) ?? null;
  const showArrow =
    note != null &&
    ARROW_FOR.has(note.classification) &&
    note.bestUci != null &&
    note.bestUci.length >= 4 &&
    note.bestUci !== played?.uci;

  const arrows = useMemo(() => {
    if (!showArrow || !note?.bestUci) return [];
    const from = note.bestUci.slice(0, 2) as Square;
    const to = note.bestUci.slice(2, 4) as Square;
    return [[from, to, '#3dd68c']] as [Square, Square, string][];
  }, [showArrow, note]);

  const rows = useMemo(() => {
    if (!replay) return [];
    const built: Array<{ n: number; white: number; black: number | null }> = [];
    for (let index = 0; index < replay.moves.length; index += 2) {
      built.push({
        n: index / 2 + 1,
        white: index,
        black: index + 1 < replay.moves.length ? index + 1 : null,
      });
    }
    return built;
  }, [replay]);

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="viewer">
      <div className="viewer-bar">
        <button type="button" className="back" onClick={onBack}>
          Games
        </button>
        <div className="viewer-title">
          <strong>vs {game.opponent}</strong>
          <span>
            {formatWhen(game.endTime)} · {game.timeClass} · {colorName(game.playerColor)} · {formatResult(game)}
          </span>
        </div>
      </div>

      {parsed.error || !replay ? (
        <p className="banner" role="alert">
          {parsed.error}
        </p>
      ) : (
        <>
          <div className="players">
            <span>
              {game.opponent} · {colorName(game.playerColor === 'w' ? 'b' : 'w')}
            </span>
            <span className="rating-mini">{game.opponentRating ?? '—'}</span>
          </div>
          <div className="board-row">
            <EvalBar
              whiteCp={position?.whiteCp ?? 0}
              mate={position?.mate ?? null}
              known={position != null}
              height={boardWidth}
            />
            <div className="board-slot" ref={slotRef}>
              <Chessboard
                id="review-board"
                position={replay.fens[ply]}
                boardWidth={boardWidth}
                boardOrientation={game.playerColor === 'b' ? 'black' : 'white'}
                arePiecesDraggable={false}
                areArrowsAllowed={false}
                animationDuration={animMs}
                customArrows={arrows}
                customDarkSquareStyle={{ backgroundColor: '#769656' }}
                customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
                customBoardStyle={{ borderRadius: '6px' }}
              />
            </div>
          </div>
          <div className="players">
            <span>You · {colorName(game.playerColor)}</span>
            <span className="rating-mini">{game.playerRating ?? '—'}</span>
          </div>

          {showArrow && note ? (
            <p className={`missed ${note.classification}`}>
              {CLASS_LABEL[note.classification]}
              {note.bestSan ? ` · best was ${note.bestSan}` : ''}
              <span> ({note.cpl} cp)</span>
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
            <button type="button" onClick={() => jump(maxPly)} aria-label="End">
              &gt;|
            </button>
            <span className="ply">
              {ply}/{maxPly}
            </span>
          </div>
          <p className="hint">Arrow keys step. Home and End jump.</p>

          <div className="analyse">
            <label>
              Depth
              <input
                type="number"
                min={8}
                max={16}
                value={depth}
                onChange={(event) => changeDepth(Number(event.target.value))}
              />
            </label>
            {running ? (
              <button type="button" onClick={stopAnalysis}>
                Stop
              </button>
            ) : (
              <button type="button" onClick={() => void startAnalysis()}>
                {analysis ? 'Reanalyse' : 'Analyse'}
              </button>
            )}
          </div>
          {running && progress ? (
            <div className="progress" aria-live="polite">
              <div className="progress-bar" style={{ width: `${percent}%` }} />
              <span>
                Analysing {progress.done}/{progress.total} · depth {depth}
              </span>
            </div>
          ) : null}
          {engineError ? (
            <p className="banner" role="alert">
              {engineError}
            </p>
          ) : null}
          {analysis ? (
            <p className="summary">
              <span className="c-best">{analysis.counts.best} best</span>
              <span className="c-good">{analysis.counts.good} good</span>
              <span className="c-inaccuracy">{analysis.counts.inaccuracy} inaccuracy</span>
              <span className="c-mistake">{analysis.counts.mistake} mistake</span>
              <span className="c-blunder">{analysis.counts.blunder} blunder</span>
            </p>
          ) : null}

          <div className="moves" aria-label="Move list">
            {rows.map((row) => (
              <div className="move-row" key={row.n}>
                <span className="mn">{row.n}.</span>
                <MoveButton
                  san={replay.moves[row.white].san}
                  active={ply === row.white + 1}
                  note={annotations.get(row.white + 1)}
                  onClick={() => jump(row.white + 1)}
                />
                {row.black != null ? (
                  <MoveButton
                    san={replay.moves[row.black].san}
                    active={ply === row.black + 1}
                    note={annotations.get(row.black + 1)}
                    onClick={() => jump(row.black! + 1)}
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
        </>
      )}
    </section>
  );
}

function MoveButton({
  san,
  active,
  note,
  onClick,
}: {
  san: string;
  active: boolean;
  note?: GameAnalysis['moves'][number];
  onClick: () => void;
}) {
  return (
    <button type="button" className={`move-btn${active ? ' on' : ''}`} onClick={onClick}>
      {note ? <span className={`mark ${note.classification}`} /> : null}
      {san}
    </button>
  );
}
