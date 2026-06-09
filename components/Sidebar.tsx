"use client";

import { Color, Difficulty, PieceType } from "@/lib/types";
import type { Grade } from "@/lib/analysis";
import PieceIcon from "./PieceIcon";

export interface SidebarProps {
  statusLabel: string;
  thinking: boolean;
  coach: { message: string; grade: Grade } | null;
  tip: string;
  aiNarration: string;
  openingName: string | null;
  log: { color: Color; san: string }[];
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  advantage: number; // positive = White ahead
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onHint: () => void;
  onUndo: () => void;
  canUndo: boolean;
  canHint: boolean;
  onNew: () => void;
  showHints: boolean;
  setShowHints: (v: boolean) => void;
  showDanger: boolean;
  setShowDanger: (v: boolean) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
}


export default function Sidebar(p: SidebarProps) {
  const rows: { n: number; w?: string; b?: string }[] = [];
  p.log.forEach((m, i) => {
    if (m.color === "w") rows.push({ n: Math.floor(i / 2) + 1, w: m.san });
    else rows[rows.length - 1].b = m.san;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {/* Coach feedback on the player's last move */}
      <div
        className={`panel ${p.coach ? "grade-" + p.coach.grade : ""}`}
        style={{ padding: 14, borderLeft: "3px solid var(--gold)" }}
      >
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          {p.coach ? "Move Review" : "Coach"}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          {p.coach ? p.coach.message : p.tip}
        </p>
        {p.openingName && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, fontStyle: "italic" }}>
            Opening: {p.openingName}
          </p>
        )}
      </div>

      {/* AI commentary */}
      {p.aiNarration && (
        <div
          className="panel fade-in"
          style={{
            padding: 14,
            borderLeft: "3px solid var(--coach)",
            background: "linear-gradient(135deg, rgba(30,24,46,0.6), rgba(24,20,36,0.7))",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: 6, color: "var(--coach)" }}>
            ♚ Opponent
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#c8bfe0" }}>{p.aiNarration}</p>
        </div>
      )}

      {/* Controls */}
      <div className="panel" style={{ padding: 12 }}>
        <div className="row gap-6 wrap" style={{ marginBottom: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={p.onHint} disabled={!p.canHint}>
            💡 Hint
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={p.onUndo} disabled={!p.canUndo}>
            ↶ Undo
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={p.onNew}>
            ↺ New
          </button>
        </div>
        <div className="row gap-6" style={{ marginBottom: 10 }}>
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`btn ${d === p.difficulty ? "active" : ""}`}
              style={{ flex: 1 }}
              onClick={() => p.onDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="row gap-12 wrap">
          <label className="toggle">
            <input type="checkbox" checked={p.showHints} onChange={(e) => p.setShowHints(e.target.checked)} />
            Moves
          </label>
          <label className="toggle">
            <input type="checkbox" checked={p.showDanger} onChange={(e) => p.setShowDanger(e.target.checked)} />
            Danger
          </label>
          <label className="toggle">
            <input type="checkbox" checked={p.sound} onChange={(e) => p.setSound(e.target.checked)} />
            Sound
          </label>
        </div>
      </div>

      {/* Material */}
      <div className="panel" style={{ padding: "10px 12px" }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          Material
        </p>
        <div className="captured">
          {p.capturedByWhite.map((t, i) => (
            <PieceIcon key={i} type={t} color="b" size={18} />
          ))}
          {p.advantage > 0 && <span className="adv">+{p.advantage}</span>}
        </div>
        <div className="captured">
          {p.capturedByBlack.map((t, i) => (
            <PieceIcon key={i} type={t} color="w" size={18} />
          ))}
          {p.advantage < 0 && (
            <span className="adv" style={{ color: "var(--danger-soft)" }}>
              +{-p.advantage}
            </span>
          )}
        </div>
      </div>

      {/* Move log */}
      <div className="panel" style={{ padding: 12, maxHeight: 260, overflow: "auto" }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          Moves
        </p>
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--faint)", fontStyle: "italic" }}>No moves yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.n} className="log-line">
              <span className="log-num">{r.n}.</span>
              <span className="log-w">{r.w ?? ""}</span>
              <span className="log-b">{r.b ?? ""}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}