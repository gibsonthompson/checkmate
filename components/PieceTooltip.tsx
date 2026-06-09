"use client";

import { Color, PieceType } from "@/lib/types";
import { PIECE_INFO } from "@/lib/pieceInfo";
import PieceIcon from "./PieceIcon";

export interface HoverInfo {
  type: PieceType;
  color: Color;
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
}

const TIP_W = 248;

export default function PieceTooltip({ info }: { info: HoverInfo }) {
  const meta = PIECE_INFO[info.type];
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  // Prefer the right side of the square; flip left if it would overflow.
  let left = info.rect.right + 12;
  if (left + TIP_W > vw - 8) left = info.rect.left - TIP_W - 12;
  if (left < 8) left = 8;

  let top = info.rect.top + info.rect.height / 2 - 90;
  if (top < 8) top = 8;
  if (top + 200 > vh - 8) top = Math.max(8, vh - 208);

  return (
    <div
      className="piece-tip"
      style={{ left, top, width: TIP_W }}
      role="tooltip"
    >
      <div className="row gap-8" style={{ marginBottom: 8, alignItems: "center" }}>
        <div className="piece-tip-icon">
          <PieceIcon type={info.type} color={info.color} size={34} />
        </div>
        <div>
          <div className="display" style={{ fontSize: 20, color: "var(--gold)", lineHeight: 1.1 }}>
            {meta.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 1 }}>
            {meta.value ? `Worth ${meta.value} point${meta.value > 1 ? "s" : ""}` : "Priceless"}
            {meta.symbol ? ` · notation "${meta.symbol}"` : " · no letter"}
          </div>
        </div>
      </div>
      <p className="piece-tip-label">How it moves</p>
      <p className="piece-tip-text">{meta.moves}</p>
      <p className="piece-tip-label">What it's for</p>
      <p className="piece-tip-text">{meta.role}</p>
      <p className="piece-tip-text" style={{ color: "var(--gold-soft)", marginTop: 6 }}>
        {meta.fact}
      </p>
    </div>
  );
}