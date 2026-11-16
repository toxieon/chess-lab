/**
 * Chess Lab — puzzles from the stored solution lines.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * A correct move is the next stored UCI for Brandon. The opponent reply is
 * the following stored UCI, played automatically. Wrong moves are not applied.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Square } from 'chess.js';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { colourLabel } from '../../mygames/format.mjs';
import { Updated } from './bits';
import { countProgress, applyUci, hintSquares, reviewPlayerAttempt, solutionMoves } from '../../mygames/puzzle.mjs';
import { readProgress, recordProgress } from '../../mygames/progress';
import type { Pattern, Puzzle, PuzzleProgress, PuzzleStatus } from '../../mygames/types';
import { BOARD_LOOK } from './board';
import { useBoardWidth } from './useBoardWidth';

type Go = (hash: string, mode?: 'push' | 'replace') => void;

function motionMs(ms: number): number {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
  return ms;
}

export function Puzzles({
  route,
  go,
  puzzles,
  patterns,
  updated,
}: {
  route: { page: 'puzzles' } | { page: 'puzzle'; id: string };
  go: Go;
  puzzles: Puzzle[];
  patterns: Pattern[];
  updated: string;
}) {
  const [progress, setProgress] = useState<PuzzleProgress>(() => readProgress());

  useEffect(() => {
    if (route.page !== 'puzzles') return;
    const saved = readProgress();
    const next = puzzles.find((puzzle) => saved[puzzle.id] !== 'solved') ?? puzzles[0];
    if (!next) return;
    go(`puzzle=${encodeURIComponent(next.id)}`, 'replace');
  }, [route.page, puzzles, go]);

  if (route.page === 'puzzles') {
    if (puzzles.length === 0) return <p className="muted">No puzzles in this export.</p>;
    return (
      <p className="status" role="status">
        Loading puzzle…
      </p>
    );
  }

  const puzzle = puzzles.find((item) => item.id === route.id);
  if (!puzzle) {
    return (
      <p className="banner" role="alert">
        That puzzle is not in this export. <a href="#puzzles">All puzzles</a>
      </p>
    );
  }

  const index = puzzles.findIndex((item) => item.id === puzzle.id);
  const totals = countProgress(progress) as { solved: number; failed: number };
  const patternTitle = patterns.find((pattern) => pattern.theme === puzzle.theme)?.title ?? '';

  function onProgress(id: string, status: PuzzleStatus) {
    setProgress((prev) => recordProgress(prev, id, status));
  }

  return (
    <section className="viewer" data-testid="puzzle">
      <Updated iso={updated} />
      <p className="status">
        Puzzle {index + 1} of {puzzles.length} · {totals.solved} solved · {totals.failed} missed
      </p>
      <PuzzleBoard
        key={puzzle.id}
        puzzle={puzzle}
        patternTitle={patternTitle}
        status={progress[puzzle.id] ?? null}
        onProgress={onProgress}
        index={index}
        total={puzzles.length}
        prevId={puzzles[(index - 1 + puzzles.length) % puzzles.length]?.id ?? puzzle.id}
        nextId={puzzles[(index + 1) % puzzles.length]?.id ?? puzzle.id}
      />
    </section>
  );
}

function PuzzleBoard({
  puzzle,
  patternTitle,
  status: stored,
  onProgress,
  index,
  total,
  prevId,
  nextId,
}: {
  puzzle: Puzzle;
  patternTitle: string;
  status: PuzzleStatus | null;
  onProgress: (id: string, status: PuzzleStatus) => void;
  index: number;
  total: number;
  prevId: string;
  nextId: string;
}) {
  const line = useMemo(() => {
    try {
      return solutionMoves(puzzle.solution) as Array<{ uci: string; san: string }>;
    } catch {
      return null;
    }
  }, [puzzle]);
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [played, setPlayed] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hint, setHint] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [animMs, setAnimMs] = useState(0);
  const fenRef = useRef(fen);
  const stepRef = useRef(step);
  const lockedRef = useRef(false);
  const doneRef = useRef(false);
  const missedRef = useRef(false);
  const promoRef = useRef('');
  const tokenRef = useRef(0);
  const { ref, width } = useBoardWidth();

  fenRef.current = fen;
  stepRef.current = step;
  lockedRef.current = locked;
  doneRef.current = done;

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
    };
  }, []);

  if (!line) {
    return (
      <p className="banner" role="alert">
        This puzzle's solution could not be read.
      </p>
    );
  }

  let fenOk = true;
  try {
    new Chess(puzzle.fen);
  } catch {
    fenOk = false;
  }
  if (!fenOk) {
    return (
      <p className="banner" role="alert">
        This puzzle position could not be shown.
      </p>
    );
  }

  function mark(next: PuzzleStatus) {
    onProgress(puzzle.id, next);
  }

  function finishClean() {
    setDone(true);
    doneRef.current = true;
    setLocked(true);
    lockedRef.current = true;
    if (!missedRef.current) {
      setMessage('Solved');
      mark('solved');
    } else {
      setMessage('Line complete');
    }
  }

  function commit(uci: string): boolean {
    if (lockedRef.current || doneRef.current || !line) return false;
    const review = reviewPlayerAttempt(puzzle.solution, stepRef.current, uci) as {
      correct: boolean;
      message: string | null;
      san: string | null;
      autoReply: { uci: string; san: string } | null;
      nextIndex: number;
      complete: boolean;
    };
    if (!review.correct) {
      missedRef.current = true;
      setMessage('Try again');
      mark('failed');
      return false;
    }
    const applied = applyUci(fenRef.current, uci) as { fen: string } | null;
    if (!applied) {
      setMessage('Try again');
      return false;
    }
    setMessage(null);
    setHint(0);
    setSelected(null);
    setPromo(null);
    setAnimMs(motionMs(280));
    setFen(applied.fen);
    setPlayed((prev) => [...prev, review.san || '']);
    if (review.autoReply) {
      const reply = review.autoReply;
      const fromFen = applied.fen;
      const token = ++tokenRef.current;
      lockedRef.current = true;
      setLocked(true);
      window.setTimeout(() => {
        if (tokenRef.current !== token) return;
        const after = applyUci(fromFen, reply.uci) as { fen: string } | null;
        if (!after) {
          setMessage('Could not play the stored reply.');
          lockedRef.current = false;
          setLocked(false);
          return;
        }
        setAnimMs(motionMs(280));
        setFen(after.fen);
        setPlayed((prev) => [...prev, reply.san]);
        setStep(review.nextIndex);
        lockedRef.current = false;
        setLocked(false);
        if (review.complete) finishClean();
      }, Math.max(motionMs(480), 40));
    } else {
      setStep(review.nextIndex);
      if (review.complete) finishClean();
    }
    return true;
  }

  function onPieceDrop(source: string, target: string) {
    if (lockedRef.current || doneRef.current) return false;
    const promotion = promoRef.current;
    promoRef.current = '';
    return commit(`${source}${target}${promotion}`);
  }

  function onPromotionPieceSelect(piece?: string) {
    if (!piece || piece.length < 2) {
      promoRef.current = '';
      return false;
    }
    promoRef.current = piece[1].toLowerCase();
    return true;
  }

  function onSquareClick(square: string) {
    if (lockedRef.current || doneRef.current) return;
    const chess = new Chess(fenRef.current);
    const piece = chess.get(square as Square);
    const turn = puzzle.side_to_move === 'white' ? 'w' : 'b';
    if (!selected) {
      if (piece && piece.color === turn) setSelected(square);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    if (piece && piece.color === turn) {
      setSelected(square);
      return;
    }
    const from = selected;
    setSelected(null);
    if (isPromotion(fenRef.current, from, square)) {
      setPromo({ from, to: square });
      return;
    }
    commit(`${from}${square}`);
  }

  function showSolution() {
    if (!line) return;
    const token = ++tokenRef.current;
    missedRef.current = true;
    mark('failed');
    doneRef.current = true;
    setDone(true);
    lockedRef.current = true;
    setLocked(true);
    setHint(0);
    setSelected(null);
    setPromo(null);
    setAnimMs(0);
    setFen(puzzle.fen);
    setPlayed([]);
    let cursor = puzzle.fen;
    line.forEach((move, moveIndex) => {
      window.setTimeout(() => {
        if (tokenRef.current !== token) return;
        const applied = applyUci(cursor, move.uci) as { fen: string } | null;
        if (!applied) {
          tokenRef.current += 1;
          setMessage('Could not play the stored solution.');
          return;
        }
        cursor = applied.fen;
        setAnimMs(motionMs(280));
        setFen(applied.fen);
        setPlayed(line.slice(0, moveIndex + 1).map((item) => item.san));
        if (moveIndex === line.length - 1) setMessage('Solution');
      }, 420 * (moveIndex + 1));
    });
  }

  const expected = line[step];
  const hintAt = expected ? (hintSquares(expected.uci) as { from: string; to: string } | null) : null;
  const squareStyles: Record<string, CSSProperties> = {};
  if (selected) squareStyles[selected] = { backgroundColor: 'rgba(122, 162, 247, 0.7)' };
  if (hint >= 1 && hintAt) squareStyles[hintAt.from] = { backgroundColor: 'rgba(255, 214, 90, 0.9)' };
  if (hint >= 2 && hintAt) squareStyles[hintAt.to] = { backgroundColor: 'rgba(61, 214, 140, 0.9)' };

  const turn = puzzle.side_to_move === 'white' ? 'w' : 'b';

  return (
    <>
      <h2 className="theme">{patternTitle || puzzle.theme}</h2>
      <p className="muted">
        Move {puzzle.source.move_number} vs {puzzle.source.opponent}
        {stored === 'solved' ? ' · Solved' : stored === 'failed' ? ' · Missed' : ''}
      </p>
      <p className="hint">{puzzle.goal || puzzle.hint}</p>
      <p className="status">You play {colourLabel(puzzle.side_to_move) as string}</p>
      <div className="board-slot" ref={ref} data-testid="puzzle-board">
        <Chessboard
          id="puzzle-board"
          position={fen}
          boardWidth={width}
          boardOrientation={puzzle.side_to_move}
          arePiecesDraggable={!locked && !done}
          isDraggablePiece={({ piece }) => piece[0] === turn}
          animationDuration={animMs}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          onPromotionPieceSelect={onPromotionPieceSelect}
          customSquareStyles={squareStyles}
          {...BOARD_LOOK}
        />
      </div>
      <p
        className={message === 'Try again' ? 'missed blunder' : message === 'Solved' ? 'missed best' : 'missed'}
        role="status"
        data-testid="puzzle-status"
        aria-live="polite"
      >
        {message || (hint === 1 ? 'The piece to move is highlighted.' : hint === 2 ? 'The piece and the target square are highlighted.' : '')}
      </p>
      <p className="moves-text" data-testid="puzzle-line">
        {played.join(' ')}
      </p>
      {promo ? (
        <div className="actions" role="group" aria-label="Promote to">
          {['q', 'r', 'b', 'n'].map((letter) => (
            <button
              key={letter}
              type="button"
              className="tool"
              onClick={() => {
                const choice = promo;
                setPromo(null);
                commit(`${choice.from}${choice.to}${letter}`);
              }}
            >
              {letter.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}
      <div className="actions">
        <button type="button" className="tool" onClick={() => setHint((value) => Math.min(2, value + 1))} disabled={done || hint >= 2}>
          Hint
        </button>
        <button type="button" className="tool" onClick={showSolution} disabled={message === 'Solution'}>
          Show solution
        </button>
        <a className="tool" href={`#puzzle=${encodeURIComponent(prevId)}`}>
          Previous
        </a>
        <a className="tool" href={`#puzzle=${encodeURIComponent(nextId)}`}>
          Next puzzle
        </a>
      </div>
      <p className="external">
        <a href={`#game=${encodeURIComponent(puzzle.source.game_id)}&ply=${puzzle.source.ply}`}>See the game</a>
      </p>
      <p className="muted">
        {index + 1}/{total}
      </p>
    </>
  );
}

function isPromotion(fen: string, from: string, to: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.moves({ square: from as Square, verbose: true }).some((move) => move.to === to && move.promotion);
  } catch {
    return false;
  }
}
