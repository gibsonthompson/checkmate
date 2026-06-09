"use client";

import { forwardRef } from "react";
import { Piece, Square as Sq } from "@/lib/types";
import { PIECE_INFO } from "@/lib/pieceInfo";
import { squareName } from "@/lib/engine";
import PieceIcon from "./PieceIcon";

interface Props {
  r: number;
  c: number;
  piece: Piece | null;
  light: boolean;
  selected: boolean;
  isTarget: boolean;
  isLast: boolean;
  isCheck: boolean;
  isDanger: boolean;
  isHint: boolean;
  draggable: boolean;
  disabled: boolean;
  dragging: boolean;
  onActivate: (sq: Sq) => void;
  onDragStart: (sq: Sq) => void;
  onDrop: (sq: Sq) => void;
  onDragEnd: () => void;
  onHover?: (sq: Sq | null, piece: Piece | null, rect: DOMRect | null) => void;
}

const SquareCell = forwardRef<HTMLButtonElement, Props>(function SquareCell(
  {
    r, c, piece, light, selected, isTarget, isLast, isCheck, isDanger, isHint,
    draggable, disabled, dragging, onActivate, onDragStart, onDrop, onDragEnd, onHover,
  },
  ref
) {
  const name = squareName(r, c);
  const occupant = piece
    ? `${piece.color === "w" ? "White" : "Black"} ${PIECE_INFO[piece.type].name}`
    : "empty";

  const classes = [
    "sq",
    light ? "light" : "dark",
    selected ? "sel" : "",
    isLast ? "last" : "",
    isCheck ? "check" : "",
    isHint ? "hint" : "",
    disabled ? "disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      aria-label={`${name}, ${occupant}${isTarget ? ", legal move" : ""}`}
      onClick={() => onActivate([r, c])}
      onMouseEnter={(e) => {
        if (onHover && piece) onHover([r, c], piece, e.currentTarget.getBoundingClientRect());
      }}
      onMouseLeave={() => { if (onHover) onHover(null, null, null); }}
      onFocus={(e) => {
        if (onHover && piece) onHover([r, c], piece, e.currentTarget.getBoundingClientRect());
      }}
      onBlur={() => { if (onHover) onHover(null, null, null); }}
      onDragOver={(e) => { if (isTarget) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); onDrop([r, c]); }}
    >
      {piece && (
        <span
          className={`glyph ${draggable ? "draggable" : ""} ${dragging ? "dragging" : ""}`}
          draggable={draggable}
          onDragStart={(e) => {
            if (!draggable) { e.preventDefault(); return; }
            e.dataTransfer.effectAllowed = "move";
            onDragStart([r, c]);
          }}
          onDragEnd={onDragEnd}
        >
          <PieceIcon type={piece.type} color={piece.color} size="100%" />
        </span>
      )}
      {isTarget && !piece && <span className="dot" />}
      {isTarget && piece && <span className="ring" />}
      {isDanger && <span className="danger-dot" aria-hidden />}
    </button>
  );
});

export default SquareCell;