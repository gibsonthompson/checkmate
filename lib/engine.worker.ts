/// <reference lib="webworker" />
// Engine worker: keeps the search off the UI thread so the board never freezes.

import { chooseMove } from "../lib/ai";
import { gradeMove, getHint, describeMove } from "../lib/analysis";
import { GameState, Move, Difficulty } from "../lib/types";

type Req =
  | { id: number; type: "ai-move"; state: GameState; difficulty: Difficulty }
  | { id: number; type: "grade"; state: GameState; move: Move }
  | { id: number; type: "hint"; state: GameState }
  | { id: number; type: "describe"; state: GameState; move: Move };

self.onmessage = (e: MessageEvent<Req>) => {
  const req = e.data;
  try {
    switch (req.type) {
      case "ai-move": {
        const move = chooseMove(req.state, req.difficulty);
        const narration = move ? describeMove(req.state, move) : "";
        (self as any).postMessage({ id: req.id, type: "ai-move", move, narration });
        break;
      }
      case "grade": {
        const report = gradeMove(req.state, req.move);
        (self as any).postMessage({ id: req.id, type: "grade", report });
        break;
      }
      case "hint": {
        const hint = getHint(req.state);
        (self as any).postMessage({ id: req.id, type: "hint", hint });
        break;
      }
      case "describe": {
        const narration = describeMove(req.state, req.move);
        (self as any).postMessage({ id: req.id, type: "describe", narration });
        break;
      }
    }
  } catch (err) {
    (self as any).postMessage({ id: req.id, type: "error", error: String(err) });
  }
};
