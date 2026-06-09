"use client";

export default function Menu({
  onLearn,
  onPlay,
}: {
  onLearn: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="center-screen fade-in">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 76,
            lineHeight: 1,
            filter: "drop-shadow(0 0 22px rgba(212,175,55,0.4))",
          }}
        >
          ♔
        </div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(40px, 8vw, 64px)",
            fontWeight: 300,
            letterSpacing: 6,
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #d4af37, #f5d778, #d4af37)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginTop: 6,
          }}
        >
          Rookie
        </h1>
        <p
          style={{
            fontSize: 13,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "var(--muted)",
            marginTop: 6,
          }}
        >
          Learn · Practice · Master
        </p>
      </div>

      <div className="row" style={{ flexDirection: "column", gap: 16, width: "100%", alignItems: "center" }}>
        <button className="btn btn-lg" onClick={onLearn}>
          ♟ Learn to Play
        </button>
        <button className="btn btn-lg" onClick={onPlay}>
          ⚔ Play vs Coach
        </button>
      </div>

      <p
        className="display"
        style={{ fontSize: 17, fontStyle: "italic", color: "var(--faint)", maxWidth: 420, textAlign: "center" }}
      >
        “Every chess master was once a beginner.”
        <br />
        <span style={{ fontSize: 13, fontStyle: "normal" }}>— Irving Chernev</span>
      </p>
    </div>
  );
}
