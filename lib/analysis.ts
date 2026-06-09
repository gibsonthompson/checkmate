import {
  allLegalMoves,
  applyMove,
  enemyOf,
  inBounds,
  isInCheck,
  isSquareAttacked,
  moveToNotation,
  pseudoLegalMoves,
  squareName,
} from "./engine";
import { searchBestMove } from "./ai";
import { Board, Color, GameState, Move, PieceType, Square } from "./types";

const VALUE: Record<PieceType, number> = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 100,
};
const NAME: Record<PieceType, string> = {
  P: "Pawn",
  N: "Knight",
  B: "Bishop",
  R: "Rook",
  Q: "Queen",
  K: "King",
};

// ─── Low-level: squares a piece attacks (enemy-occupied targets) ────
export function attackTargets(board: Board, r: number, c: number): Square[] {
  const piece = board[r][c];
  if (!piece) return [];
  const enemy = enemyOf(piece.color);
  const targets: Square[] = [];
  const dir = piece.color === "w" ? -1 : 1;

  const ray = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr,
        nc = c + dc;
      while (inBounds(nr, nc)) {
        const t = board[nr][nc];
        if (t) {
          if (t.color === enemy) targets.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  };
  const step = (deltas: number[][]) => {
    for (const [dr, dc] of deltas) {
      const nr = r + dr,
        nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.color === enemy)
        targets.push([nr, nc]);
    }
  };

  switch (piece.type) {
    case "P":
      for (const dc of [-1, 1]) {
        const nr = r + dir,
          nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color === enemy)
          targets.push([nr, nc]);
      }
      break;
    case "N":
      step([
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ]);
      break;
    case "B":
      ray([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;
    case "R":
      ray([[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;
    case "Q":
      ray([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;
    case "K":
      step([
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1],
      ]);
      break;
  }
  return targets;
}

export interface HangingPiece {
  square: Square;
  type: PieceType;
  name: string;
  defended: boolean;
}

// Pieces of `color` that the enemy attacks and that are NOT defended (free to grab),
// or attacked by a cheaper piece (a losing exchange). Ordered by value, biggest first.
export function findHangingPieces(state: GameState, color: Color): HangingPiece[] {
  const board = state.board;
  const enemy = enemyOf(color);
  const out: HangingPiece[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color || p.type === "K") continue;
      const attacked = isSquareAttacked(board, r, c, enemy);
      if (!attacked) continue;
      const defended = isSquareAttacked(board, r, c, color);
      // Free piece, or a piece attacked by something cheaper than it.
      const cheapestAttacker = cheapestAttackerValue(board, r, c, enemy);
      const losing = !defended || cheapestAttacker < VALUE[p.type];
      if (losing) {
        out.push({ square: [r, c], type: p.type, name: NAME[p.type], defended });
      }
    }
  return out.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}

function cheapestAttackerValue(
  board: Board,
  r: number,
  c: number,
  byColor: Color
): number {
  let cheapest = 99;
  for (let rr = 0; rr < 8; rr++)
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p || p.color !== byColor) continue;
      if (attackTargets(board, rr, cc).some((t) => t[0] === r && t[1] === c)) {
        cheapest = Math.min(cheapest, VALUE[p.type]);
      }
    }
  return cheapest;
}

// ─── Move grading (blunder detection) ───────────────────────────────
export type Grade =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface MoveReport {
  grade: Grade;
  loss: number; // centipawns lost vs best
  bestMove: Move | null;
  bestNotation: string | null;
  message: string;
}

const GRADE_DEPTH = 2;

export function gradeMove(before: GameState, move: Move): MoveReport {
  const mover = before.turn;
  const perspective = mover === "w" ? 1 : -1;

  const best = searchBestMove(before, GRADE_DEPTH);
  const after = applyMove(before, move);
  // value of resulting position with best opposing play, white-positive
  const played = searchBestMove(after, Math.max(0, GRADE_DEPTH - 1));

  const bestWhite = best.score;
  const playedWhite = played.score;
  let loss = perspective * (bestWhite - playedWhite);
  if (loss < 0) loss = 0;

  let grade: Grade;
  if (loss < 20) grade = "best";
  else if (loss < 60) grade = "excellent";
  else if (loss < 110) grade = "good";
  else if (loss < 200) grade = "inaccuracy";
  else if (loss < 400) grade = "mistake";
  else grade = "blunder";

  // If the move literally hangs material that wasn't hanging before, force at least "mistake".
  const hangingBefore = findHangingPieces(before, mover).reduce(
    (s, h) => s + VALUE[h.type],
    0
  );
  const afterForMover: GameState = { ...after, turn: mover };
  const hangingAfter = findHangingPieces(afterForMover, mover).reduce(
    (s, h) => s + VALUE[h.type],
    0
  );
  const newlyHanging = hangingAfter - hangingBefore;
  if (newlyHanging >= 3 && (grade === "best" || grade === "excellent" || grade === "good"))
    grade = "mistake";
  if (newlyHanging >= 5 && grade !== "blunder") grade = "blunder";

  const bestNotation = best.move ? moveToNotation(before, best.move) : null;
  const message = buildGradeMessage({
    grade,
    before,
    move,
    after,
    mover,
    bestMove: best.move,
    bestNotation,
    oppReply: played.move,
    newlyHanging,
  });

  return { grade, loss, bestMove: best.move, bestNotation, message };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// "developed your Knight to f3", "took your Bishop on c4 with my Knight", etc.
function actionPhrase(move: Move, who: "you" | "ai"): string {
  const my = who === "you" ? "your" : "my";
  const to = squareName(move.to[0], move.to[1]);
  if (move.castle) return `castled ${move.castle === "K" ? "kingside" : "queenside"}`;
  if (move.promotion) return `promoted ${my} pawn to a ${NAME[move.promotion]} on ${to}`;
  if (move.captured) {
    const verb = who === "you" ? "captured" : "took";
    const owner = who === "you" ? "the" : "your";
    return `${verb} ${owner} ${NAME[move.captured]} on ${to} with ${my} ${NAME[move.piece]}`;
  }
  const central = move.to[0] >= 2 && move.to[0] <= 5 && move.to[1] >= 2 && move.to[1] <= 5;
  switch (move.piece) {
    case "P":
      return `pushed ${my} ${to[0]}-pawn to ${to}`;
    case "N":
      return central ? `developed ${my} Knight to ${to}` : `moved ${my} Knight to ${to}`;
    case "B":
      return `developed ${my} Bishop to ${to}`;
    case "R":
      return `brought ${my} Rook to ${to}`;
    case "Q":
      return `moved ${my} Queen to ${to}`;
    default:
      return `moved ${my} King to ${to}`;
  }
}

// A plain-language reason a move is good.
function moveBenefit(before: GameState, move: Move): string {
  const after = applyMove(before, move);
  const enemy = enemyOf(move.color);
  if (isInCheck(after.board, enemy)) {
    return allLegalMoves(after, enemy).length === 0 ? "it delivers checkmate" : "it gives check";
  }
  if (move.captured) {
    const recapture = isSquareAttacked(after.board, move.to[0], move.to[1], enemy);
    if (!recapture) return `it wins the ${NAME[move.captured]} for free`;
    if (VALUE[move.captured] > VALUE[move.piece])
      return `it wins material — a ${NAME[move.captured]} for a ${NAME[move.piece]}`;
    return `it trades off the ${NAME[move.captured]}`;
  }
  if (move.castle) return "it gets your king to safety and connects your rooks";
  const hangBefore = findHangingPieces(before, move.color).length;
  const forMover: GameState = { ...after, turn: move.color };
  const hangAfter = findHangingPieces(forMover, move.color).length;
  if (hangAfter < hangBefore) return "it rescues a piece that was under attack";
  const enemyHang = findHangingPieces(after, enemy).filter((h) => h.type !== "P");
  if (enemyHang.length > 0) return `it attacks the ${enemyHang[0].name} on ${squareName(enemyHang[0].square[0], enemyHang[0].square[1])}`;
  const central = move.to[0] >= 2 && move.to[0] <= 5 && move.to[1] >= 2 && move.to[1] <= 5;
  if (move.piece === "N" || move.piece === "B") return "it develops a piece toward the centre";
  if (move.piece === "P" && central) return "it fights for the centre";
  return "it keeps your position solid";
}

function biggestHangingAfter(after: GameState, mover: Color): HangingPiece | null {
  const forMover: GameState = { ...after, turn: mover };
  const list = findHangingPieces(forMover, mover);
  return list.length ? list[0] : null;
}

function captureConsequence(after: GameState, oppReply: Move | null): string {
  if (!oppReply || !oppReply.captured) return "";
  const san = moveToNotation(after, oppReply);
  return ` Your opponent can reply ${san}, winning your ${NAME[oppReply.captured]}.`;
}

interface GradeMsgArgs {
  grade: Grade;
  before: GameState;
  move: Move;
  after: GameState;
  mover: Color;
  bestMove: Move | null;
  bestNotation: string | null;
  oppReply: Move | null;
  newlyHanging: number;
}

function buildGradeMessage(a: GradeMsgArgs): string {
  const action = capitalize(actionPhrase(a.move, "you"));
  const verdict: Record<Grade, string> = {
    best: "That's the best move in the position",
    excellent: "A really strong move",
    good: "A solid choice",
    inaccuracy: "Playable, but not the most precise",
    mistake: "That's a mistake",
    blunder: "Careful — that's a blunder",
  };

  const positive = a.grade === "best" || a.grade === "excellent" || a.grade === "good";
  if (positive) {
    return `${action}. ${verdict[a.grade]} — ${moveBenefit(a.before, a.move)}.`;
  }

  let msg = `${action}. ${verdict[a.grade]}.`;
  const hang = biggestHangingAfter(a.after, a.mover);
  if (a.newlyHanging >= 1 && hang) {
    msg += ` It leaves your ${hang.name} on ${squareName(hang.square[0], hang.square[1])} ${hang.defended ? "able to be won" : "undefended"}.`;
    msg += captureConsequence(a.after, a.oppReply);
  }
  if (a.bestMove && a.bestNotation) {
    msg += ` A stronger move was ${a.bestNotation} — ${moveBenefit(a.before, a.bestMove)}.`;
  }
  return msg;
}

// ─── Tactical narration for the AI's moves (first person) ───────────
export function describeMove(before: GameState, move: Move): string {
  const after = applyMove(before, move);
  const enemy = enemyOf(move.color); // the player

  if (move.castle) {
    return `I castled ${move.castle === "K" ? "kingside" : "queenside"}, tucking my king into safety and bringing a rook toward the centre.`;
  }

  let msg = capitalize(`I ${actionPhrase(move, "ai")}.`);

  // Fork / double attack created by the moved piece.
  const targets = attackTargets(after.board, move.to[0], move.to[1]).filter(
    (t) => VALUE[after.board[t[0]][t[1]]!.type] >= 3
  );
  if (targets.length >= 2) {
    const names = targets.map((t) => NAME[after.board[t[0]][t[1]]!.type]);
    msg += ` That forks your ${names.join(" and ")} — you can't save both.`;
  }

  if (isInCheck(after.board, enemy)) {
    const replies = allLegalMoves(after, enemy);
    msg += replies.length === 0 ? " Checkmate." : " Check — your king has to respond before anything else.";
    return msg;
  }

  // Did the move create a threat against an undefended piece of yours?
  const hang = findHangingPieces(after, enemy);
  const threat = hang.find(
    (h) => !(move.captured && h.square[0] === move.to[0] && h.square[1] === move.to[1])
  );
  if (threat) {
    msg += ` Watch out — it now threatens your ${threat.name} on ${squareName(threat.square[0], threat.square[1])}.`;
  }
  return msg;
}

// ─── Hint ────────────────────────────────────────────────────────────
export interface Hint {
  move: Move | null;
  notation: string | null;
  text: string;
}

export function getHint(state: GameState): Hint {
  const { move } = searchBestMove(state, 2);
  if (!move) return { move: null, notation: null, text: "No legal moves available." };
  const notation = moveToNotation(state, move);
  const toSq = squareName(move.to[0], move.to[1]);
  const piece = move.castle ? "King" : NAME[move.piece];
  const text = `Try your ${piece} to ${toSq} — ${moveBenefit(state, move)}.`;
  return { move, notation, text };
}

// ─── Opening recognition ────────────────────────────────────────────
const OPENINGS: { seq: string[]; name: string }[] = [
  { seq: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy López" },
  { seq: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game" },
  { seq: ["e4", "e5", "Nf3", "Nc6", "d4"], name: "Scotch Game" },
  { seq: ["e4", "e5", "Nf3"], name: "King's Knight Opening" },
  { seq: ["e4", "c5"], name: "Sicilian Defence" },
  { seq: ["e4", "e6"], name: "French Defence" },
  { seq: ["e4", "c6"], name: "Caro-Kann Defence" },
  { seq: ["e4", "d5"], name: "Scandinavian Defence" },
  { seq: ["e4", "e5"], name: "Open Game" },
  { seq: ["e4"], name: "King's Pawn Opening" },
  { seq: ["d4", "d5", "c4"], name: "Queen's Gambit" },
  { seq: ["d4", "Nf6", "c4", "g6"], name: "King's Indian Defence" },
  { seq: ["d4", "d5"], name: "Closed Game" },
  { seq: ["d4", "Nf6"], name: "Indian Defence" },
  { seq: ["d4"], name: "Queen's Pawn Opening" },
  { seq: ["c4"], name: "English Opening" },
  { seq: ["Nf3"], name: "Réti Opening" },
  { seq: ["g3"], name: "Hungarian Opening" },
  { seq: ["b3"], name: "Larsen's Opening" },
];

export function nameOpening(sanList: string[]): string | null {
  if (sanList.length === 0) return null;
  let bestName: string | null = null;
  let bestLen = 0;
  for (const o of OPENINGS) {
    if (o.seq.length > sanList.length) continue;
    const matches = o.seq.every((s, i) => sanList[i] === s);
    if (matches && o.seq.length > bestLen) {
      bestLen = o.seq.length;
      bestName = o.name;
    }
  }
  return bestName;
}

// ─── Contextual coaching tip ────────────────────────────────────────
export function getPositionalTip(state: GameState, color: Color): string {
  const board = state.board;
  const row = color === "w" ? 7 : 0;

  // Count undeveloped minor pieces still on the back rank.
  let undeveloped = 0;
  for (const c of [1, 2, 5, 6]) {
    const p = board[row][c];
    if (p && p.color === color && (p.type === "N" || p.type === "B")) undeveloped++;
  }
  const kingHome = board[row][4]?.type === "K" && board[row][4]?.color === color;
  const castled =
    (color === "w" && (!state.castling.wK && !state.castling.wQ)) ||
    (color === "b" && (!state.castling.bK && !state.castling.bQ));

  // Highest-priority advice first.
  const hanging = findHangingPieces(state, color);
  if (hanging.length > 0 && hanging[0].type !== "P") {
    return `⚠️ Your ${hanging[0].name} on ${squareName(
      hanging[0].square[0],
      hanging[0].square[1]
    )} can be captured — defend it or move it.`;
  }
  if (state.fullmove <= 8 && undeveloped >= 2) {
    return "🎯 Develop your Knights and Bishops toward the centre before launching attacks.";
  }
  if (state.fullmove <= 12 && kingHome && !castled) {
    return "🏰 Consider castling soon to get your King safe and connect your Rooks.";
  }
  return ROTATING_TIPS[Math.floor(Math.random() * ROTATING_TIPS.length)];
}

const ROTATING_TIPS = [
  "💡 Before each move ask: what does my opponent threaten?",
  "💡 Look for checks, captures, and threats — in that order.",
  "💡 Put Rooks on open files; they're highways for your heavy pieces.",
  "💡 A Knight on the rim is dim — keep Knights near the centre.",
  "💡 Don't move the same piece twice in the opening without a reason.",
  "💡 Trade pieces when ahead in material, keep them on when behind.",
  "💡 Doubled and isolated pawns are long-term weaknesses — avoid creating them.",
  "💡 If you see a good move, look for a better one before you commit.",
];