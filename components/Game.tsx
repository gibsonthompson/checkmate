"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  initialState,
  applyMove,
  legalMovesFrom,
  moveToNotation,
  getStatus,
  isGameOver,
  isInCheck,
  findKing,
} from "@/lib/engine";
import { findHangingPieces, getPositionalTip, nameOpening } from "@/lib/analysis";
import type { Grade } from "@/lib/analysis";
import { Color, Difficulty, GameState, Move, Piece, PieceType, Square as Sq } from "@/lib/types";
import { useEngineWorker } from "@/lib/useEngineWorker";
import { playSound, setSoundEnabled } from "@/lib/sounds";
import ChessBoard from "./ChessBoard";
import PieceIcon from "./PieceIcon";
import PieceTooltip, { HoverInfo } from "./PieceTooltip";
import Sidebar from "./Sidebar";
import { PromotionModal, ConfirmDialog } from "./Modals";

interface Frame {
  state: GameState;
  lastMove: { from: Sq; to: Sq } | null;
  capturedByWhite: PieceType[]; // black pieces White has taken
  capturedByBlack: PieceType[]; // white pieces Black has taken
  log: { color: Color; san: string }[];
}

const VAL: Record<PieceType, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

function initialFrame(): Frame {
  return {
    state: initialState(),
    lastMove: null,
    capturedByWhite: [],
    capturedByBlack: [],
    log: [],
  };
}

function commitMove(frame: Frame, move: Move): Frame {
  const san = moveToNotation(frame.state, move);
  const newState = applyMove(frame.state, move);
  const capturedByWhite = [...frame.capturedByWhite];
  const capturedByBlack = [...frame.capturedByBlack];
  if (move.captured) {
    if (move.color === "w") capturedByWhite.push(move.captured);
    else capturedByBlack.push(move.captured);
  }
  return {
    state: newState,
    lastMove: { from: move.from, to: move.to },
    capturedByWhite,
    capturedByBlack,
    log: [...frame.log, { color: move.color, san }],
  };
}

function soundFor(before: GameState, move: Move, after: GameState): void {
  const status = getStatus(after);
  if (status === "checkmate") playSound("check");
  else if (status === "check") playSound("check");
  else if (move.castle) playSound("castle");
  else if (move.promotion) playSound("promote");
  else if (move.captured) playSound("capture");
  else playSound("move");
}

export default function Game({ onExit }: { onExit: () => void }) {
  const { aiMove, gradePlayerMove, requestHint } = useEngineWorker();

  const [frames, setFrames] = useState<Frame[]>([initialFrame()]);
  const current = frames[frames.length - 1];
  const state = current.state;

  // Ephemeral UI state
  const [selected, setSelected] = useState<Sq | null>(null);
  const [legalTargets, setLegalTargets] = useState<Sq[]>([]);
  const [draggingFrom, setDraggingFrom] = useState<Sq | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [thinking, setThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Sq; to: Sq; color: Color } | null>(null);
  const [coach, setCoach] = useState<{ message: string; grade: Grade } | null>(null);
  const [aiNarration, setAiNarration] = useState("");
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [tip, setTip] = useState("Your move. Tap a piece to see where it can go.");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [confirmDiff, setConfirmDiff] = useState<Difficulty | null>(null);

  // Learning aids
  const [showHints, setShowHints] = useState(true);
  const [showDanger, setShowDanger] = useState(true);
  const [sound, setSound] = useState(true);

  useEffect(() => setSoundEnabled(sound), [sound]);

  // Derived game status
  const status = useMemo(() => getStatus(state), [state]);
  const over = isGameOver(status);
  const playerTurn = state.turn === "w" && !thinking && !over;

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      if (status === "checkmate") {
        // The side to move is checkmated.
        playSound(state.turn === "w" ? "lose" : "win");
      } else if (
        status === "stalemate" ||
        status === "draw-fifty" ||
        status === "draw-material" ||
        status === "draw-repetition"
      ) {
        playSound("lose");
      }
      prevStatusRef.current = status;
    }
  }, [status, state.turn]);

  const clearSelection = () => {
    setSelected(null);
    setLegalTargets([]);
  };

  const select = useCallback(
    (sq: Sq) => {
      const moves = legalMovesFrom(state, sq[0], sq[1]);
      if (moves.length === 0) {
        clearSelection();
        return;
      }
      setSelected(sq);
      setLegalTargets(moves.map((m) => m.to));
      playSound("select");
    },
    [state]
  );

  // Core: play a fully-resolved player move, then let the AI reply.
  const playPlayerMove = useCallback(
    async (move: Move) => {
      const beforeFrame = current;
      const playerFrame = commitMove(beforeFrame, move);
      soundFor(beforeFrame.state, move, playerFrame.state);
      setFrames((prev) => [...prev, playerFrame]);
      clearSelection();
      setHintMove(null);
      setAiNarration("");

      // Grade asynchronously (worker), show when ready.
      gradePlayerMove(beforeFrame.state, move)
        .then(({ report }) => setCoach({ message: report.message, grade: report.grade }))
        .catch(() => {});

      const afterStatus = getStatus(playerFrame.state);
      if (isGameOver(afterStatus)) return;

      // AI reply
      setThinking(true);
      try {
        const { move: aiMv, narration } = await aiMove(playerFrame.state, difficulty);
        if (aiMv) {
          const aiFrame = commitMove(playerFrame, aiMv);
          soundFor(playerFrame.state, aiMv, aiFrame.state);
          setFrames((prev) => [...prev, aiFrame]);
          setAiNarration(narration);
          const tipState = aiFrame.state;
          setTip(getPositionalTip(tipState, "w"));
        }
      } finally {
        setThinking(false);
      }
    },
    [current, aiMove, gradePlayerMove, difficulty]
  );

  // Resolve a click/drop onto a target square.
  const attemptMoveTo = useCallback(
    (to: Sq) => {
      if (!selected) return;
      const moves = legalMovesFrom(state, selected[0], selected[1]);
      const matches = moves.filter((m) => m.to[0] === to[0] && m.to[1] === to[1]);
      if (matches.length === 0) return;

      // Promotion: more than one match (Q/R/B/N) → ask the user.
      if (matches.length > 1 && matches[0].promotion) {
        setPendingPromotion({ from: selected, to, color: state.turn });
        return;
      }
      void playPlayerMove(matches[0]);
    },
    [selected, state, playPlayerMove]
  );

  const onActivate = useCallback(
    (sq: Sq) => {
      if (!playerTurn) return;
      const isTarget = legalTargets.some((t) => t[0] === sq[0] && t[1] === sq[1]);
      if (selected && isTarget) {
        attemptMoveTo(sq);
        return;
      }
      const piece = state.board[sq[0]][sq[1]];
      if (piece && piece.color === "w") select(sq);
      else clearSelection();
    },
    [playerTurn, legalTargets, selected, state, attemptMoveTo, select]
  );

  const onDragStart = useCallback(
    (sq: Sq) => {
      if (!playerTurn) return;
      setDraggingFrom(sq);
      select(sq);
    },
    [playerTurn, select]
  );
  const onDrop = useCallback(
    (sq: Sq) => {
      if (!playerTurn || !draggingFrom) return;
      attemptMoveTo(sq);
      setDraggingFrom(null);
    },
    [playerTurn, draggingFrom, attemptMoveTo]
  );
  const onDragEnd = useCallback(() => setDraggingFrom(null), []);

  const onHover = useCallback((_sq: Sq | null, piece: Piece | null, rect: DOMRect | null) => {
    if (piece && rect) {
      setHover({
        type: piece.type,
        color: piece.color,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      });
    } else {
      setHover(null);
    }
  }, []);

  // Promotion modal pick
  const finishPromotion = (promo: PieceType) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    const moves = legalMovesFrom(state, from[0], from[1]);
    const move = moves.find(
      (m) => m.to[0] === to[0] && m.to[1] === to[1] && m.promotion === promo
    );
    setPendingPromotion(null);
    if (move) void playPlayerMove(move);
  };

  // Hint
  const onHint = useCallback(() => {
    if (!playerTurn) return;
    requestHint(state)
      .then(({ hint }) => {
        if (hint.move) setHintMove(hint.move);
        setCoach({ message: hint.text, grade: "good" });
        setTimeout(() => setHintMove(null), 2600);
      })
      .catch(() => {});
  }, [playerTurn, requestHint, state]);

  // Undo: revert back to the player's previous turn (drops AI reply + player move).
  const onUndo = useCallback(() => {
    setFrames((prev) => {
      if (prev.length <= 1) return prev;
      let arr = prev.slice(0, -1);
      while (arr.length > 1 && arr[arr.length - 1].state.turn !== "w") {
        arr = arr.slice(0, -1);
      }
      return arr;
    });
    clearSelection();
    setCoach(null);
    setAiNarration("");
    setHintMove(null);
  }, []);

  const newGame = useCallback(() => {
    setFrames([initialFrame()]);
    clearSelection();
    setCoach(null);
    setAiNarration("");
    setHintMove(null);
    setThinking(false);
    setTip("Your move. Tap a piece to see where it can go.");
    prevStatusRef.current = "playing";
  }, []);

  const changeDifficulty = (d: Difficulty) => {
    if (d === difficulty) return;
    if (frames.length > 1 && !over) {
      setConfirmDiff(d);
    } else {
      setDifficulty(d);
    }
  };

  // Derived board overlays
  const checkSquare = useMemo<Sq | null>(
    () => (isInCheck(state.board, state.turn) ? findKing(state.board, state.turn) : null),
    [state]
  );
  const dangerSquares = useMemo<Set<string>>(() => {
    if (!showDanger || !playerTurn) return new Set();
    return new Set(
      findHangingPieces(state, "w").map((h) => `${h.square[0]}-${h.square[1]}`)
    );
  }, [showDanger, playerTurn, state]);

  const advantage = useMemo(() => {
    const w = current.capturedByWhite.reduce((s, t) => s + VAL[t], 0);
    const b = current.capturedByBlack.reduce((s, t) => s + VAL[t], 0);
    return w - b;
  }, [current]);

  const openingName = useMemo(
    () => nameOpening(current.log.map((l) => l.san)),
    [current.log]
  );

  const statusLabel = useMemo(() => {
    switch (status) {
      case "checkmate":
        return state.turn === "w" ? "Checkmate — Coach wins" : "Checkmate — You win!";
      case "stalemate":
        return "Draw — stalemate";
      case "draw-fifty":
        return "Draw — 50-move rule";
      case "draw-material":
        return "Draw — insufficient material";
      case "draw-repetition":
        return "Draw — threefold repetition";
      case "check":
        return thinking ? "Coach is thinking…" : "Check! Your move";
      default:
        return thinking ? "Coach is thinking…" : "Your move";
    }
  }, [status, state.turn, thinking]);

  return (
    <div className="fade-in">
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 14px 0" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn" onClick={onExit}>
            ← Menu
          </button>
          <span
            className="display"
            style={{ fontSize: 22, color: "var(--gold)", letterSpacing: 2 }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="game-grid">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {/* Black's captures sit above the board from White's view */}
          <div className="captured" style={{ alignSelf: "stretch", justifyContent: "center" }}>
            {current.capturedByBlack.map((t, i) => (
              <PieceIcon key={i} type={t} color="w" size={20} />
            ))}
          </div>

          <ChessBoard
            board={state.board}
            selected={selected}
            legalTargets={showHints ? legalTargets : []}
            lastMove={current.lastMove}
            checkSquare={checkSquare}
            dangerSquares={dangerSquares}
            hintMove={hintMove}
            movableColor={playerTurn ? "w" : null}
            disabled={!playerTurn}
            draggingFrom={draggingFrom}
            onActivate={onActivate}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onHover={onHover}
          />

          <div className="captured" style={{ alignSelf: "stretch", justifyContent: "center" }}>
            {current.capturedByWhite.map((t, i) => (
              <PieceIcon key={i} type={t} color="b" size={20} />
            ))}
          </div>
        </div>

        <Sidebar
          statusLabel={statusLabel}
          thinking={thinking}
          coach={coach}
          tip={tip}
          aiNarration={aiNarration}
          openingName={openingName}
          log={current.log}
          capturedByWhite={current.capturedByWhite}
          capturedByBlack={current.capturedByBlack}
          advantage={advantage}
          difficulty={difficulty}
          onDifficulty={changeDifficulty}
          onHint={onHint}
          onUndo={onUndo}
          canUndo={frames.length > 1 && !thinking}
          canHint={playerTurn}
          onNew={newGame}
          showHints={showHints}
          setShowHints={setShowHints}
          showDanger={showDanger}
          setShowDanger={setShowDanger}
          sound={sound}
          setSound={setSound}
        />
      </div>

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onPick={finishPromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
      {hover && <PieceTooltip info={hover} />}
      {confirmDiff && (
        <ConfirmDialog
          title="Change difficulty?"
          body="Switching difficulty will start a new game. Your current position will be lost."
          confirmLabel="New game"
          onConfirm={() => {
            setDifficulty(confirmDiff);
            setConfirmDiff(null);
            newGame();
          }}
          onCancel={() => setConfirmDiff(null)}
        />
      )}
    </div>
  );
}