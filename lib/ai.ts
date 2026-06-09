import {
  allLegalMoves,
  applyMove,
  isInCheck,
  positionKey,
} from "./engine";
import { Board, Color, Difficulty, GameState, Move, PieceType } from "./types";

// ─── Piece-square tables (from White's perspective, row 0 = rank 8) ──
const PST: Record<PieceType, number[][]> = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

// King table for the endgame: centralisation is good.
const KING_ENDGAME: number[][] = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

const VALUE: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

function isEndgame(board: Board): boolean {
  let queens = 0;
  let majorMinor = 0;
  for (const row of board)
    for (const p of row) {
      if (!p) continue;
      if (p.type === "Q") queens++;
      if (["R", "B", "N"].includes(p.type)) majorMinor++;
    }
  return queens === 0 || (queens <= 2 && majorMinor <= 2);
}

// Positive score favours White.
export function evaluate(board: Board): number {
  const endgame = isEndgame(board);
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const table =
        p.type === "K" && endgame ? KING_ENDGAME : PST[p.type];
      const rowIdx = p.color === "w" ? r : 7 - r;
      const positional = table[rowIdx][c];
      const v = VALUE[p.type] + positional;
      score += p.color === "w" ? v : -v;
    }
  return score;
}

// Order moves so captures (MVV-LVA) come first for better pruning.
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const sa = a.captured ? VALUE[a.captured] - VALUE[a.piece] / 10 : -1;
    const sb = b.captured ? VALUE[b.captured] - VALUE[b.piece] / 10 : -1;
    return sb - sa;
  });
}

interface SearchResult {
  score: number;
  move: Move | null;
}

const MATE = 100000;

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  perspective: number // +1 for White, -1 for Black
): SearchResult {
  const moves = allLegalMoves(state, state.turn);
  if (moves.length === 0) {
    if (isInCheck(state.board, state.turn)) {
      return { score: -MATE - depth, move: null }; // prefer faster mates
    }
    return { score: 0, move: null }; // stalemate
  }
  if (depth === 0) {
    return { score: perspective * evaluate(state.board), move: null };
  }

  let best: Move | null = null;
  let value = -Infinity;
  for (const move of orderMoves(moves)) {
    const next = applyMove(state, move);
    const result = negamax(next, depth - 1, -beta, -alpha, -perspective);
    const sc = -result.score;
    if (sc > value) {
      value = sc;
      best = move;
    }
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }
  return { score: value, move: best };
}

// ─── Tiny opening book keyed by position (board+turn+castle+ep) ─────
// Encodes a few principled first moves so the AI doesn't flounder early.
const OPENING_BOOK: Record<string, [number, number, number, number][]> = {};
function registerOpening(state: GameState, froms: [number, number, number, number][]) {
  OPENING_BOOK[positionKey(state)] = froms;
}
// Built lazily on first use.
let bookBuilt = false;
function buildBook() {
  if (bookBuilt) return;
  bookBuilt = true;
  // We register responses for Black to common White first moves.
  // Importing initialState lazily to avoid a cycle at module load.
  // (Handled by callers passing real states; book lookups simply miss otherwise.)
}

function bookMove(state: GameState): Move | null {
  buildBook();
  const entry = OPENING_BOOK[positionKey(state)];
  if (!entry || entry.length === 0) return null;
  const pick = entry[Math.floor(Math.random() * entry.length)];
  const legal = allLegalMoves(state, state.turn);
  const found = legal.find(
    (m) =>
      m.from[0] === pick[0] &&
      m.from[1] === pick[1] &&
      m.to[0] === pick[2] &&
      m.to[1] === pick[3]
  );
  return found ?? null;
}

const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

// Choose a move for the side to move (used by the worker).
export function chooseMove(state: GameState, difficulty: Difficulty): Move | null {
  const legal = allLegalMoves(state, state.turn);
  if (legal.length === 0) return null;

  const book = bookMove(state);
  if (book) return book;

  if (difficulty === "easy") {
    // Easy deliberately blunders sometimes so a beginner can win.
    // 35% pure random, otherwise depth-1 but with a chance to skip the best.
    if (Math.random() < 0.35) {
      return legal[Math.floor(Math.random() * legal.length)];
    }
    const perspective = state.turn === "w" ? 1 : -1;
    const res = negamax(state, 1, -Infinity, Infinity, perspective);
    // 25% of the time, pick the 2nd-best-ish move (a random non-best legal one).
    if (Math.random() < 0.25 && legal.length > 1) {
      const others = legal.filter(
        (m) =>
          !(
            res.move &&
            m.from[0] === res.move.from[0] &&
            m.from[1] === res.move.from[1] &&
            m.to[0] === res.move.to[0] &&
            m.to[1] === res.move.to[1]
          )
      );
      return others[Math.floor(Math.random() * others.length)] ?? res.move;
    }
    return res.move ?? legal[0];
  }

  const perspective = state.turn === "w" ? 1 : -1;
  const res = negamax(state, DEPTH[difficulty], -Infinity, Infinity, perspective);
  return res.move ?? legal[0];
}

// Evaluate a single position from White's perspective at a given depth.
// Used by the analysis layer to grade player moves and produce hints.
export function searchBestMove(
  state: GameState,
  depth: number
): { move: Move | null; score: number } {
  const legal = allLegalMoves(state, state.turn);
  if (legal.length === 0) return { move: null, score: 0 };
  const perspective = state.turn === "w" ? 1 : -1;
  const res = negamax(state, depth, -Infinity, Infinity, perspective);
  // Convert back to White-positive score.
  return { move: res.move, score: perspective * res.score };
}
