"use client";

import { useState } from "react";
import Menu from "@/components/Menu";
import Tutorial from "@/components/Tutorial";
import Game from "@/components/Game";

type Mode = "menu" | "tutorial" | "game";

export default function Page() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="app">
      {mode === "menu" && (
        <Menu onLearn={() => setMode("tutorial")} onPlay={() => setMode("game")} />
      )}
      {mode === "tutorial" && (
        <Tutorial onExit={() => setMode("menu")} onFinish={() => setMode("game")} />
      )}
      {mode === "game" && <Game onExit={() => setMode("menu")} />}
    </main>
  );
}
