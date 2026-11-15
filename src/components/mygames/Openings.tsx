/**
 * Chess Lab — openings with stored names, scores, and the usual moves.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { colourLabel, formatMelbourne, formatScore, formatWdl, resultLabel } from '../../mygames/format.mjs';
import { playSanLine } from '../../mygames/line.mjs';
import type { Colour, Opening, OpeningVariation } from '../../mygames/types';
import { BOARD_LOOK } from './board';
import { Updated } from './bits';
import { useBoardWidth } from './useBoardWidth';

type LineStats = {
  name: string;
  eco: string;
  moves: string;
  win: number;
  draw: number;
  loss: number;
  score_pct: number;
};

export function Openings({
  asWhite,
  asBlack,
  updated,
}: {
  asWhite: Opening[];
  asBlack: Opening[];
  updated: string;
}) {
  const [side, setSide] = useState<Colour>('white');
  const [selected, setSelected] = useState<number | null>(null);
  const rows = side === 'white' ? asWhite : asBlack;
  const opening = selected != null ? rows[selected] : null;

  function chooseSide(next: Colour) {
    setSide(next);
    setSelected(null);
  }

  if (opening) {
    return (
      <OpeningDetail
        opening={opening}
        updated={updated}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <section className="list" aria-label="Openings" data-testid="openings">
      <Updated iso={updated} />
      <h2>Openings</h2>
      <div className="filters" role="tablist" aria-label="Colour">
        <button type="button" className={side === 'white' ? 'chip on' : 'chip'} aria-pressed={side === 'white'} onClick={() => chooseSide('white')}>
          White <span>{asWhite.length}</span>
        </button>
        <button type="button" className={side === 'black' ? 'chip on' : 'chip'} aria-pressed={side === 'black'} onClick={() => chooseSide('black')}>
          Black <span>{asBlack.length}</span>
        </button>
      </div>
      {rows.length === 0 ? <p className="muted">No openings for this colour.</p> : null}
      <ul>
        {rows.map((row, index) => (
          <li key={`${row.colour}-${row.eco}-${index}`}>
            <button type="button" className="game" onClick={() => setSelected(index)}>
              <span className="game-top">
                <span className="vs">{row.name}</span>
                <span className="result">{formatScore(row.score_pct) as string}</span>
              </span>
              <span className="game-mid">
                <span className="as">{row.eco}</span>
                <span className="tc">{formatWdl(row) as string}</span>
                <span className="when">{row.games} games</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OpeningDetail({ opening, updated, onBack }: { opening: Opening; updated: string; onBack: () => void }) {
  const [lineKey, setLineKey] = useState('main');
  const active: LineStats = lineKey === 'main' ? opening : opening.variations[Number(lineKey)] ?? opening;

  useEffect(() => {
    setLineKey('main');
  }, [opening]);

  return (
    <section className="viewer" data-testid="opening">
      <Updated iso={updated} />
      <div className="viewer-bar">
        <button type="button" className="back" onClick={onBack}>
          Openings
        </button>
        <div className="viewer-title">
          <strong>{opening.name}</strong>
          <span>
            {colourLabel(opening.colour) as string} · {opening.eco}
          </span>
        </div>
      </div>
      <p data-testid="opening-score">
        {formatWdl(active) as string} · {formatScore(active.score_pct) as string}
        <span className="muted"> · {active.win + active.draw + active.loss} games</span>
      </p>
      {opening.eco_url ? (
        <p className="external">
          <a href={opening.eco_url} target="_blank" rel="noreferrer">
            {opening.eco} on Chess.com
          </a>
        </p>
      ) : null}
      <p className="opening-expl" data-testid="opening-explanation">
        {opening.explanation}
      </p>
      {opening.variations.length > 0 ? (
        <label className="line-label">
          Line
          <select className="line-select" value={lineKey} onChange={(event) => setLineKey(event.target.value)} aria-label="Opening line">
            <option value="main">{opening.name}</option>
            {opening.variations.map((variation, index) => (
              <option key={`${variation.eco}-${index}`} value={String(index)}>
                {variationLabel(variation)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <LineBoard moves={active.moves} orientation={opening.colour} title={active.name} />
      {opening.example_games.length > 0 ? (
        <>
          <h3>Example games</h3>
          <ul className="example-games">
            {opening.example_games.map((example) => (
              <li key={example.id}>
                <a href={`#game=${encodeURIComponent(example.id)}`}>
                  {formatMelbourne(example.date, false) as string} · {resultLabel(example.result) as string}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function variationLabel(variation: OpeningVariation): string {
  return `${variation.name} · ${variation.eco} · ${formatWdl(variation)}`;
}

function LineBoard({ moves, orientation, title }: { moves: string; orientation: Colour; title: string }) {
  const parsed = useMemo(() => {
    try {
      return { line: playSanLine(moves) as { fens: string[]; sans: string[] }, error: null as string | null };
    } catch (error) {
      return { line: null, error: error instanceof Error ? error.message : 'Could not play this line' };
    }
  }, [moves]);
  const max = parsed.line ? parsed.line.fens.length - 1 : 0;
  const [ply, setPly] = useState(0);
  const [animMs, setAnimMs] = useState(0);
  const plyRef = useRef(0);
  const { ref, width } = useBoardWidth();

  useEffect(() => {
    plyRef.current = 0;
    setPly(0);
    setAnimMs(0);
  }, [moves]);

  function jump(next: number) {
    const clamped = Math.max(0, Math.min(max, next));
    plyRef.current = clamped;
    setAnimMs(0);
    setPly(clamped);
  }

  function step(delta: number) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const next = Math.max(0, Math.min(max, plyRef.current + delta));
    if (next === plyRef.current) return;
    setAnimMs(reduced ? 0 : 250);
    plyRef.current = next;
    setPly(next);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      <p className="moves-text" data-testid="opening-moves">
        {title}: {moves}
      </p>
      {parsed.error || !parsed.line ? (
        <p className="banner" role="alert">
          {parsed.error}
        </p>
      ) : (
        <>
          <div className="board-slot" ref={ref} data-testid="opening-board">
            <Chessboard
              id="opening-board"
              position={parsed.line.fens[ply]}
              boardWidth={width}
              boardOrientation={orientation}
              arePiecesDraggable={false}
              animationDuration={animMs}
              {...BOARD_LOOK}
            />
          </div>
          <div className="transport" aria-label="Opening moves">
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
            <span className="ply" data-testid="opening-ply">
              {ply}/{max}
            </span>
          </div>
          <p className="hint">{ply === 0 ? 'Start' : parsed.line.sans[ply - 1]}</p>
        </>
      )}
    </div>
  );
}
