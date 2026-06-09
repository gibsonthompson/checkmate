import {
  Board,
  CastlingRights,
  Color,
  GameState,
  GameStatus,
  Move,
  Piece,
  PieceType,
  Square,
} from "./types";

export const FILES = "abcdefgh";

// ─── Construction ───────────────────────────────────────────────────
export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: "b" };
    board[1][c] = { type: "P", color: "b" };
    board[6][c] = { type: "P", color: "w" };
    board[7][c] = { type: back[c], color: "w" };
  }
  return board;
}

export function initialState(): GameState {
  const state: GameState = {
    board: createInitialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
  };
  state.history.push(positionKey(state));
  return state;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function cloneState(s: GameState): GameState {
  return {
    board: cloneBoard(s.board),
    turn: s.turn,
    castling: { ...s.castling },
    enPassant: s.enPassant ? [s.enPassant[0], s.enPassant[1]] : null,
    halfmove: s.halfmove,
    fullmove: s.fullmove,
    history: [...s.history],
  };
}

// ─── Helpers ────────────────────────────────────────────────────────
export const inBounds = (r: number, c: number) =>
  r >= 0 && r < 8 && c >= 0 && c < 8;

export const enemyOf = (color: Color): Color => (color === "w" ? "b" : "w");

export function squareName(r: number, c: number): string {
  return FILES[c] + (8 - r);
}

export function findKing(board: Board, color: Color): Square | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color)
        return [r, c];
  return null;
}

// ─── Attack detection (geometry only, fast, no recursion) ───────────
const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
];
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHOGONALS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function isSquareAttacked(
  board: Board,
  r: number,
  c: number,
  byColor: Color
): boolean {
  // Pawns: a byColor pawn sits "behind" the square relative to its march direction.
  // White marches up (toward row 0), so a white pawn attacking (r,c) sits at (r+1, c±1).
  const pawnRow = byColor === "w" ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    if (inBounds(pawnRow, c + dc)) {
      const p = board[pawnRow][c + dc];
      if (p && p.color === byColor && p.type === "P") return true;
    }
  }
  // Knights
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const nr = r + dr,
      nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === "N") return true;
    }
  }
  // King
  for (const [dr, dc] of KING_DELTAS) {
    const nr = r + dr,
      nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === "K") return true;
    }
  }
  // Sliding diagonals (bishop / queen)
  for (const [dr, dc] of DIAGONALS) {
    let nr = r + dr,
      nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === "B" || p.type === "Q"))
          return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Sliding orthogonals (rook / queen)
  for (const [dr, dc] of ORTHOGONALS) {
    let nr = r + dr,
      nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === "R" || p.type === "Q"))
          return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king[0], king[1], enemyOf(color));
}

// ─── Pseudo-legal move generation for a single piece ────────────────
function pushPawnMoves(
  state: GameState,
  r: number,
  c: number,
  out: Move[]
): void {
  const { board } = state;
  const piece = board[r][c]!;
  const color = piece.color;
  const dir = color === "w" ? -1 : 1;
  const startRow = color === "w" ? 6 : 1;
  const promoRow = color === "w" ? 0 : 7;
  const enemy = enemyOf(color);

  const addPawn = (to: Square, captured?: PieceType, enPassant?: boolean) => {
    if (to[0] === promoRow) {
      for (const promo of ["Q", "R", "B", "N"] as PieceType[]) {
        out.push({
          from: [r, c],
          to,
          piece: "P",
          color,
          captured,
          promotion: promo,
          enPassant,
        });
      }
    } else {
      out.push({ from: [r, c], to, piece: "P", color, captured, enPassant });
    }
  };

  // forward one
  if (inBounds(r + dir, c) && !board[r + dir][c]) {
    addPawn([r + dir, c]);
    // forward two
    if (r === startRow && !board[r + 2 * dir][c]) {
      out.push({
        from: [r, c],
        to: [r + 2 * dir, c],
        piece: "P",
        color,
        double: true,
      });
    }
  }
  // captures
  for (const dc of [-1, 1]) {
    const nr = r + dir,
      nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (target && target.color === enemy) {
      addPawn([nr, nc], target.type);
    } else if (
      state.enPassant &&
      state.enPassant[0] === nr &&
      state.enPassant[1] === nc
    ) {
      addPawn([nr, nc], "P", true);
    }
  }
}

function pushSlidingMoves(
  board: Board,
  r: number,
  c: number,
  dirs: number[][],
  out: Move[]
): void {
  const piece = board[r][c]!;
  const enemy = enemyOf(piece.color);
  for (const [dr, dc] of dirs) {
    let nr = r + dr,
      nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (target) {
        if (target.color === enemy)
          out.push({
            from: [r, c],
            to: [nr, nc],
            piece: piece.type,
            color: piece.color,
            captured: target.type,
          });
        break;
      }
      out.push({
        from: [r, c],
        to: [nr, nc],
        piece: piece.type,
        color: piece.color,
      });
      nr += dr;
      nc += dc;
    }
  }
}

function pushStepMoves(
  board: Board,
  r: number,
  c: number,
  deltas: number[][],
  out: Move[]
): void {
  const piece = board[r][c]!;
  for (const [dr, dc] of deltas) {
    const nr = r + dr,
      nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const target = board[nr][nc];
    if (target && target.color === piece.color) continue;
    out.push({
      from: [r, c],
      to: [nr, nc],
      piece: piece.type,
      color: piece.color,
      captured: target?.type,
    });
  }
}

function pushCastlingMoves(
  state: GameState,
  r: number,
  c: number,
  out: Move[]
): void {
  const { board, castling } = state;
  const piece = board[r][c]!;
  const color = piece.color;
  const row = color === "w" ? 7 : 0;
  if (r !== row || c !== 4) return;
  const enemy = enemyOf(color);
  if (isSquareAttacked(board, row, 4, enemy)) return; // can't castle out of check

  const kingSide = color === "w" ? castling.wK : castling.bK;
  const queenSide = color === "w" ? castling.wQ : castling.bQ;

  if (
    kingSide &&
    board[row][7]?.type === "R" &&
    board[row][7]?.color === color &&
    !board[row][5] &&
    !board[row][6] &&
    !isSquareAttacked(board, row, 5, enemy) &&
    !isSquareAttacked(board, row, 6, enemy)
  ) {
    out.push({
      from: [row, 4],
      to: [row, 6],
      piece: "K",
      color,
      castle: "K",
    });
  }
  if (
    queenSide &&
    board[row][0]?.type === "R" &&
    board[row][0]?.color === color &&
    !board[row][1] &&
    !board[row][2] &&
    !board[row][3] &&
    !isSquareAttacked(board, row, 3, enemy) &&
    !isSquareAttacked(board, row, 2, enemy)
  ) {
    out.push({
      from: [row, 4],
      to: [row, 2],
      piece: "K",
      color,
      castle: "Q",
    });
  }
}

export function pseudoLegalMoves(state: GameState, r: number, c: number): Move[] {
  const piece = state.board[r][c];
  if (!piece) return [];
  const out: Move[] = [];
  switch (piece.type) {
    case "P":
      pushPawnMoves(state, r, c, out);
      break;
    case "N":
      pushStepMoves(state.board, r, c, KNIGHT_DELTAS, out);
      break;
    case "B":
      pushSlidingMoves(state.board, r, c, DIAGONALS, out);
      break;
    case "R":
      pushSlidingMoves(state.board, r, c, ORTHOGONALS, out);
      break;
    case "Q":
      pushSlidingMoves(state.board, r, c, [...DIAGONALS, ...ORTHOGONALS], out);
      break;
    case "K":
      pushStepMoves(state.board, r, c, KING_DELTAS, out);
      pushCastlingMoves(state, r, c, out);
      break;
  }
  return out;
}

// ─── Apply a move (returns a NEW state) ─────────────────────────────
// Applies to a board only, for fast legality testing.
function applyMoveToBoard(board: Board, move: Move): Board {
  const nb = cloneBoard(board);
  const piece = nb[move.from[0]][move.from[1]]!;
  nb[move.to[0]][move.to[1]] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  nb[move.from[0]][move.from[1]] = null;

  if (move.enPassant) {
    // captured pawn is on the moving pawn's row, target's column
    nb[move.from[0]][move.to[1]] = null;
  }
  if (move.castle) {
    const row = move.from[0];
    if (move.castle === "K") {
      nb[row][5] = nb[row][7];
      nb[row][7] = null;
    } else {
      nb[row][3] = nb[row][0];
      nb[row][0] = null;
    }
  }
  return nb;
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const piece = next.board[move.from[0]][move.from[1]]!;

  next.board = applyMoveToBoard(next.board, move);

  // castling rights
  const cr = next.castling;
  if (piece.type === "K") {
    if (piece.color === "w") {
      cr.wK = false;
      cr.wQ = false;
    } else {
      cr.bK = false;
      cr.bQ = false;
    }
  }
  // moving a rook off its home square
  const rookHome: Record<string, keyof CastlingRights> = {
    "7,0": "wQ",
    "7,7": "wK",
    "0,0": "bQ",
    "0,7": "bK",
  };
  const fromKey = `${move.from[0]},${move.from[1]}`;
  if (rookHome[fromKey]) cr[rookHome[fromKey]] = false;
  // capturing a rook on its home square removes opponent's rights
  const toKey = `${move.to[0]},${move.to[1]}`;
  if (rookHome[toKey]) cr[rookHome[toKey]] = false;

  // en passant target
  next.enPassant = move.double
    ? [(move.from[0] + move.to[0]) / 2, move.from[1]]
    : null;

  // halfmove clock (50-move rule)
  if (piece.type === "P" || move.captured) next.halfmove = 0;
  else next.halfmove += 1;

  next.turn = enemyOf(state.turn);
  if (state.turn === "b") next.fullmove += 1;

  next.history.push(positionKey(next));
  return next;
}

// ─── Legal move filtering ───────────────────────────────────────────
export function legalMovesFrom(state: GameState, r: number, c: number): Move[] {
  const piece = state.board[r][c];
  if (!piece || piece.color !== state.turn) return [];
  return pseudoLegalMoves(state, r, c).filter((m) => {
    const nb = applyMoveToBoard(state.board, m);
    return !isInCheck(nb, piece.color);
  });
}

export function allLegalMoves(state: GameState, color?: Color): Move[] {
  const side = color ?? state.turn;
  const out: Move[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p || p.color !== side) continue;
      for (const m of pseudoLegalMoves(state, r, c)) {
        const nb = applyMoveToBoard(state.board, m);
        if (!isInCheck(nb, side)) out.push(m);
      }
    }
  return out;
}

// ─── Position key (FEN-ish) for repetition detection ────────────────
export function positionKey(state: GameState): string {
  let s = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      s += p ? (p.color === "w" ? p.type : p.type.toLowerCase()) : ".";
    }
  }
  s += "|" + state.turn;
  s +=
    "|" +
    (state.castling.wK ? "K" : "") +
    (state.castling.wQ ? "Q" : "") +
    (state.castling.bK ? "k" : "") +
    (state.castling.bQ ? "q" : "");
  s += "|" + (state.enPassant ? `${state.enPassant[0]}${state.enPassant[1]}` : "-");
  return s;
}

// ─── Game status ────────────────────────────────────────────────────
function hasMajorOrPawn(board: Board, color: Color): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && (p.type === "P" || p.type === "R" || p.type === "Q"))
        return true;
    }
  return false;
}

function countMinor(board: Board): { w: number; b: number; bishops: number; knights: number } {
  let w = 0,
    b = 0,
    bishops = 0,
    knights = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === "B" || p.type === "N") {
        if (p.color === "w") w++;
        else b++;
        if (p.type === "B") bishops++;
        else knights++;
      }
    }
  return { w, b, bishops, knights };
}

export function isInsufficientMaterial(board: Board): boolean {
  if (hasMajorOrPawn(board, "w") || hasMajorOrPawn(board, "b")) return false;
  const { w, b, bishops, knights } = countMinor(board);
  const total = w + b;
  // K vs K, K+minor vs K, K+minor vs K+minor are drawish enough to call.
  if (total === 0) return true; // K vs K
  if (total === 1) return true; // lone minor
  if (total === 2 && bishops + knights === 2) return true; // two minors total
  return false;
}

export function getStatus(state: GameState): GameStatus {
  const inCheck = isInCheck(state.board, state.turn);
  const moves = allLegalMoves(state, state.turn);
  if (moves.length === 0) return inCheck ? "checkmate" : "stalemate";
  if (state.halfmove >= 100) return "draw-fifty";
  if (isInsufficientMaterial(state.board)) return "draw-material";
  // threefold repetition
  const key = positionKey(state);
  let count = 0;
  for (const k of state.history) if (k === key) count++;
  if (count >= 3) return "draw-repetition";
  return inCheck ? "check" : "playing";
}

export function isGameOver(status: GameStatus): boolean {
  return (
    status === "checkmate" ||
    status === "stalemate" ||
    status === "draw-fifty" ||
    status === "draw-material" ||
    status === "draw-repetition"
  );
}

// ─── SAN-lite notation for the move log ─────────────────────────────
export function moveToNotation(state: GameState, move: Move): string {
  if (move.castle === "K") return "O-O";
  if (move.castle === "Q") return "O-O-O";
  const letter = move.piece === "P" ? "" : move.piece;
  const capture = move.captured ? "x" : "";
  const fromFile = move.piece === "P" && move.captured ? FILES[move.from[1]] : "";
  const dest = squareName(move.to[0], move.to[1]);
  const promo = move.promotion ? "=" + move.promotion : "";
  const next = applyMove(state, move);
  const status = getStatus(next);
  const suffix = status === "checkmate" ? "#" : status === "check" ? "+" : "";
  return `${letter}${fromFile}${capture}${dest}${promo}${suffix}`;
}
