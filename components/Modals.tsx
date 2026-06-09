"use client";

import { Color, PieceType } from "@/lib/types";
import PieceIcon from "./PieceIcon";

export function PromotionModal({
  color,
  onPick,
  onCancel,
}: {
  color: Color;
  onPick: (p: PieceType) => void;
  onCancel: () => void;
}) {
  const options: PieceType[] = ["Q", "R", "B", "N"];
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          Promote your pawn
        </p>
        <div className="row gap-12" style={{ justifyContent: "center" }}>
          {options.map((p) => (
            <button
              key={p}
              className="btn"
              style={{ fontSize: 40, padding: "10px 14px", lineHeight: 1 }}
              aria-label={`Promote to ${p}`}
              onClick={() => onPick(p)}
            >
              <PieceIcon type={p} color={color} size={40} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="display" style={{ fontSize: 24, color: "var(--gold)", marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 18 }}>
          {body}
        </p>
        <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}