"use client";

import { useEffect, useMemo, useState } from "react";
import { TUTORIAL, PieceStep, buildDemoState } from "@/lib/tutorial";
import { legalMovesFrom, cloneBoard } from "@/lib/engine";
import { Board, Move, Square as Sq } from "@/lib/types";
import ChessBoard from "./ChessBoard";
import MiniBoard from "./MiniBoard";
import PieceIcon from "./PieceIcon";
import { playSound } from "@/lib/sounds";

export default function Tutorial({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL[step];

  return (
    <div className="fade-in" style={{ maxWidth: 920, margin: "0 auto", padding: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <button className="btn" onClick={onExit}>
          ← Menu
        </button>
        <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2 }}>
          {step + 1} / {TUTORIAL.length}
        </span>
      </div>

      <div
        style={{
          height: 3,
          background: "rgba(139,105,20,0.16)",
          borderRadius: 2,
          marginBottom: 22,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((step + 1) / TUTORIAL.length) * 100}%`,
            background: "linear-gradient(90deg, var(--gold-dim), var(--gold))",
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {current.kind === "intro" ? (
        <IntroCard key={step} step={current} />
      ) : (
        <PieceCard key={step} step={current} />
      )}

      <div className="row gap-8" style={{ justifyContent: "space-between", marginTop: 22 }}>
        <button
          className="btn"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← Previous
        </button>
        {step < TUTORIAL.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
            Next →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={onFinish}>
            Start Playing ⚔
          </button>
        )}
      </div>
    </div>
  );
}

function IntroCard({ step }: { step: Extract<(typeof TUTORIAL)[number], { kind: "intro" }> }) {
  return (
    <div className="panel slide-up" style={{ padding: "clamp(22px,5vw,40px)" }}>
      <div style={{ fontSize: 46, textAlign: "center", marginBottom: 14 }}>{step.icon}</div>
      <h2
        className="display"
        style={{
          fontSize: "clamp(26px,5vw,34px)",
          fontWeight: 400,
          textAlign: "center",
          color: "var(--gold)",
          letterSpacing: 2,
          marginBottom: 20,
        }}
      >
        {step.title}
      </h2>
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {step.body.map((p, i) => (
          <p key={i} style={{ fontSize: "clamp(15px,3.4vw,17px)", lineHeight: 1.75, color: "var(--text)" }}>
            {p}
          </p>
        ))}
      </div>
      {step.diagram && (
        <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
          <MiniBoard spec={step.diagram} size={300} />
        </div>
      )}
    </div>
  );
}

function PieceCard({ step }: { step: PieceStep }) {
  const demoState = useMemo(() => buildDemoState(step), [step]);
  const [movedTo, setMovedTo] = useState<Sq | null>(null);

  const targets: Sq[] = useMemo(
    () => legalMovesFrom(demoState, step.from[0], step.from[1]).map((m) => m.to),
    [demoState, step]
  );

  // Reset the demo whenever the step changes.
  useEffect(() => {
    setMovedTo(null);
  }, [step]);

  // Auto-revert after a demonstration move.
  useEffect(() => {
    if (!movedTo) return;
    const t = setTimeout(() => setMovedTo(null), 1100);
    return () => clearTimeout(t);
  }, [movedTo]);

  const displayBoard: Board = useMemo(() => {
    if (!movedTo) return demoState.board;
    const nb = cloneBoard(demoState.board);
    nb[movedTo[0]][movedTo[1]] = nb[step.from[0]][step.from[1]];
    nb[step.from[0]][step.from[1]] = null;
    return nb;
  }, [movedTo, demoState, step]);

  const handleActivate = (sq: Sq) => {
    if (movedTo) return;
    const isTarget = targets.some((t) => t[0] === sq[0] && t[1] === sq[1]);
    if (isTarget) {
      const capturing = !!demoState.board[sq[0]][sq[1]];
      playSound(capturing ? "capture" : "move");
      setMovedTo(sq);
    }
  };

  return (
    <div className="tut-grid slide-up">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "min(82vw, 330px)" }}>
          <ChessBoard
            size="min(82vw, 330px)"
            board={displayBoard}
            selected={movedTo ? null : step.from}
            legalTargets={movedTo ? [] : targets}
            lastMove={null}
            checkSquare={null}
            dangerSquares={new Set()}
            hintMove={null}
            movableColor={null}
            disabled={false}
            draggingFrom={null}
            onActivate={handleActivate}
            onDragStart={() => {}}
            onDrop={() => {}}
            onDragEnd={() => {}}
          />
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            {targets.length} possible moves — tap a highlighted square to see it move.
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: 22 }}>
        <div className="row gap-12" style={{ marginBottom: 14 }}>
          <span style={{ width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PieceIcon type={step.piece} color="w" size={46} />
          </span>
          <div>
            <h2 className="display" style={{ fontSize: 30, color: "var(--gold)", letterSpacing: 1 }}>
              {step.title}
            </h2>
            <span className="eyebrow">
              Value: {step.value ? `${step.value} point${step.value > 1 ? "s" : ""}` : "Priceless"}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--muted)", marginBottom: 16 }}>
          {step.blurb}
        </p>

        <div
          style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            borderLeft: "3px solid var(--gold)",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            How it moves
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--text)" }}>{step.howItMoves}</p>
        </div>

        <div
          style={{
            background: "rgba(139,105,20,0.1)",
            borderRadius: 8,
            padding: 14,
            borderLeft: "3px solid var(--gold-dim)",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: 6, color: "var(--gold-dim)" }}>
            Strategy
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--muted)" }}>{step.strategy}</p>
        </div>
      </div>
    </div>
  );
}