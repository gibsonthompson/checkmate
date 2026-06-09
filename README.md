# Rookie

An interactive chess learning app built with **Next.js 14 (App Router) + TypeScript**. It teaches the game from zero, then lets you play a tunable AI coach that grades every one of your moves in real time.

## Features

- **Interactive tutorial** — every piece is demonstrated *live*: its legal squares light up and you tap to watch it move (with captures shown), not just static placement.
- **Real-time move grading** — after each of your moves, a coach classifies it (best → blunder), warns when you hang material, and suggests a stronger move.
- **Hint system** — ask for the engine's recommended move at any time; it flashes on the board.
- **AI opponent that explains itself** — narrates captures, forks, checks, development, and castling.
- **Three difficulties** — easy deliberately blunders so beginners can win; medium and hard search deeper.
- **Full legal chess** — castling, en passant, under-promotion (Q/R/B/N), check, checkmate, stalemate, plus **threefold repetition, the 50-move rule, and insufficient-material draws**.
- **Learning aids** — legal-move dots, a danger highlighter for your hanging pieces, and a check highlight on the board.
- **Quality-of-life** — undo/takeback, material score, opening recognition, move log in algebraic notation, synthesized sounds, drag-and-drop *and* tap-to-move.
- **Accessible** — every square is a real button with an ARIA label; arrow keys move focus, Enter/Space activates.
- **Responsive** — the board scales to the viewport; the layout reflows for mobile and desktop.

## Architecture

The engine is intentionally separated from React so it can be tested and reused (and run inside a Web Worker).

```
lib/
  types.ts            Shared types (Board, Move, GameState, …)
  engine.ts           Pure chess engine: move generation, legality,
                      special moves, draw detection, SAN notation
  ai.ts               Tapered evaluation + alpha-beta negamax search,
                      difficulty tuning, opening book hook
  analysis.ts         Move grading (blunder detection), hanging-piece
                      detection, tactical narration, hints, opening names,
                      contextual coaching tips
  tutorial.ts         Tutorial content + live demo-position builder
  sounds.ts           Web Audio synthesized sound effects (no asset files)
  engine.worker.ts    Web Worker: runs search/grading/hints off-thread
  useEngineWorker.ts  Hook wrapping the worker with a main-thread fallback
components/
  Menu / Tutorial / Game        Three top-level screens
  ChessBoard / SquareCell       Accessible board + squares
  Sidebar                       Coach, move log, material, controls
  Modals                        Promotion picker + confirm dialog
app/
  layout.tsx  page.tsx  globals.css
```

The AI search runs in a **Web Worker** so the UI never freezes. If a worker can't be created (rare environments), `useEngineWorker` transparently falls back to running on the main thread.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

```bash
npm i -g vercel   # if you don't have it
vercel            # follow the prompts; framework auto-detected as Next.js
```

Or push to a Git repo and import it at [vercel.com/new](https://vercel.com/new) — no configuration needed.

## Notes

- Pure functions in `lib/engine.ts` make the rules easy to unit-test.
- The evaluation is a classic piece-square-table model with a tapered king table for the endgame; it plays sensible club-beginner chess, which is the point — it's a teaching opponent, not a world champion.
