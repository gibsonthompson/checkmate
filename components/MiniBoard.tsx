"use client";

import { Color, PieceType, Square } from "@/lib/types";
import { FILES } from "@/lib/engine";
import PieceIcon from "./PieceIcon";

export interface MiniPiece {
  sq: Square;
  type: PieceType;
  color: Color;
}
export interface MiniArrow {
  from: Square;
  to: Square;
}
export interface MiniBoardSpec {
  highlights?: Square[];
  pieces?: MiniPiece[];
  arrows?: MiniArrow[];
  caption?: string;
}

const k = (r: number, c: number) => `${r}-${c}`;
// center of a square in a 0..8 coordinate space (col -> x, row -> y)
const cx = (c: number) => c + 0.5;
const cy = (r: number) => r + 0.5;

export default function MiniBoard({ spec, size = 280 }: { spec: MiniBoardSpec; size?: number }) {
  const hi = new Set((spec.highlights ?? []).map(([r, c]) => k(r, c)));
  const pieceAt = new Map<string, MiniPiece>();
  (spec.pieces ?? []).forEach((p) => pieceAt.set(k(p.sq[0], p.sq[1]), p));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div className="mini-wrap" style={{ width: size, height: size }}>
        <div className="mini-grid">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((__, c) => {
              const light = (r + c) % 2 === 0;
              const p = pieceAt.get(k(r, c));
              return (
                <div
                  key={k(r, c)}
                  className={`mini-sq ${light ? "light" : "dark"} ${hi.has(k(r, c)) ? "hi" : ""}`}
                >
                  {p && <PieceIcon type={p.type} color={p.color} size="86%" />}
                </div>
              );
            })
          )}
        </div>
        {spec.arrows && spec.arrows.length > 0 && (
          <svg className="mini-arrows" viewBox="0 0 8 8" preserveAspectRatio="none">
            <defs>
              <marker id="ah" markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto">
                <path d="M0,0 L3,1.5 L0,3 Z" fill="var(--gold)" />
              </marker>
            </defs>
            {spec.arrows.map((a, i) => (
              <line
                key={i}
                x1={cx(a.from[1])}
                y1={cy(a.from[0])}
                x2={cx(a.to[1])}
                y2={cy(a.to[0])}
                stroke="var(--gold)"
                strokeWidth={0.16}
                strokeLinecap="round"
                markerEnd="url(#ah)"
                opacity={0.9}
              />
            ))}
          </svg>
        )}
      </div>
      {spec.caption && (
        <p style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", maxWidth: size + 30 }}>
          {spec.caption}
        </p>
      )}
    </div>
  );
}