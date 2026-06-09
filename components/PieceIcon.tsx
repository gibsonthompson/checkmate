"use client";

import { Color, PieceType } from "@/lib/types";
import { PIECE_INFO } from "@/lib/pieceInfo";

export default function PieceIcon({
  type,
  color,
  size,
  className,
}: {
  type: PieceType;
  color: Color;
  size?: number | string;
  className?: string;
}) {
  const src = `/pieces/${color}${type}.svg`;
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${color === "w" ? "White" : "Black"} ${PIECE_INFO[type].name}`}
      className={className}
      draggable={false}
      style={dim ? { width: dim, height: dim, display: "block" } : { display: "block" }}
    />
  );
}