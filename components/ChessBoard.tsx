"use client";

import { useRef, KeyboardEvent } from "react";
import { Board, Move, Piece, Square as Sq } from "@/lib/types";
import { FILES } from "@/lib/engine";
import SquareCell from "./SquareCell";

interface Props {
  board: Board;
  selected: Sq | null;
  legalTargets: Sq[];
  lastMove: { from: Sq; to: Sq } | null;
  checkSquare: Sq | null;
  dangerSquares: Set<string>;
  hintMove: Move | null;
  movableColor: "w" | "b" | null; // which colour the user may pick up (null = none)
  disabled: boolean;
  draggingFrom: Sq | null;
  onActivate: (sq: Sq) => void;
  onDragStart: (sq: Sq) => void;
  onDrop: (sq: Sq) => void;
  onDragEnd: () => void;
  onHover?: (sq: Sq | null, piece: Piece | null, rect: DOMRect | null) => void;
  size?: string;
}

const key = (r: number, c: number) => `${r}-${c}`;

export default function ChessBoard({
  board,
  selected,
  legalTargets,
  lastMove,
  checkSquare,
  dangerSquares,
  hintMove,
  movableColor,
  disabled,
  draggingFrom,
  onActivate,
  onDragStart,
  onDrop,
  onDragEnd,
  onHover,
  size,
}: Props) {
  const targetSet = new Set(legalTargets.map(([r, c]) => key(r, c)));
  const refs = useRef<(HTMLButtonElement | null)[][]>(
    Array.from({ length: 8 }, () => Array(8).fill(null))
  );

  const focusSquare = (r: number, c: number) => {
    if (r < 0 || r > 7 || c < 0 || c > 7) return;
    refs.current[r][c]?.focus();
  };

  const handleKey = (e: KeyboardEvent, r: number, c: number) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        focusSquare(r - 1, c);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusSquare(r + 1, c);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusSquare(r, c - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusSquare(r, c + 1);
        break;
    }
  };

  return (
    <div
      className="board-wrap"
      role="grid"
      aria-label="Chess board"
      style={size ? ({ ["--bw" as any]: size }) : undefined}
      onKeyDown={(e) => {
        const active = document.activeElement as HTMLElement;
        const pos = active?.getAttribute?.("data-pos");
        if (pos) {
          const [r, c] = pos.split("-").map(Number);
          handleKey(e, r, c);
        }
      }}
    >
      {board.map((row, r) => (
        <div key={`r-${r}`} style={{ display: "contents" }} role="row">
          <div className="coord mono" aria-hidden>
            {8 - r}
          </div>
          {row.map((piece, c) => {
            const isSel = !!selected && selected[0] === r && selected[1] === c;
            const isLast =
              !!lastMove &&
              ((lastMove.from[0] === r && lastMove.from[1] === c) ||
                (lastMove.to[0] === r && lastMove.to[1] === c));
            const isCheck =
              !!checkSquare && checkSquare[0] === r && checkSquare[1] === c;
            const isHint =
              !!hintMove &&
              ((hintMove.from[0] === r && hintMove.from[1] === c) ||
                (hintMove.to[0] === r && hintMove.to[1] === c));
            const draggable =
              !disabled &&
              !!piece &&
              movableColor !== null &&
              piece.color === movableColor;
            const isDragging =
              !!draggingFrom && draggingFrom[0] === r && draggingFrom[1] === c;

            return (
              <CellWrapper key={key(r, c)} r={r} c={c} refs={refs}>
                <SquareCell
                  r={r}
                  c={c}
                  piece={piece}
                  light={(r + c) % 2 === 0}
                  selected={isSel}
                  isTarget={targetSet.has(key(r, c))}
                  isLast={isLast}
                  isCheck={isCheck}
                  isDanger={dangerSquares.has(key(r, c))}
                  isHint={isHint}
                  draggable={draggable}
                  disabled={disabled}
                  dragging={isDragging}
                  onActivate={onActivate}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  onHover={onHover}
                />
              </CellWrapper>
            );
          })}
        </div>
      ))}
      <div className="coord" aria-hidden />
      {FILES.split("").map((f) => (
        <div key={`f-${f}`} className="coord mono" aria-hidden>
          {f}
        </div>
      ))}
    </div>
  );
}

// Tiny wrapper to register the button ref for keyboard focus + data-pos attribute.
function CellWrapper({
  r,
  c,
  refs,
  children,
}: {
  r: number;
  c: number;
  refs: React.MutableRefObject<(HTMLButtonElement | null)[][]>;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{ display: "contents" }}
      ref={(el) => {
        const btn = el?.querySelector("button") as HTMLButtonElement | null;
        if (btn) {
          btn.setAttribute("data-pos", `${r}-${c}`);
          refs.current[r][c] = btn;
        }
      }}
    >
      {children}
    </span>
  );
}