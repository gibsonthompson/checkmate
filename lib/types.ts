// Shared types for the chess engine, AI, and analysis layers.

export type Color = "w" | "b";
export type PieceType = "P" | "N" | "B" | "R" | "Q" | "K";

export interface Piece {
  type: PieceType;
  color: Color;
}

// Board is 8x8. Row 0 = rank 8 (Black's back rank), row 7 = rank 1 (White's back rank).
// Col 0 = file a, col 7 = file h.
export type Board = (Piece | null)[][];
export type Square = [number, number]; // [row, col]

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface Move {
  from: Square;
  to: Square;
  piece: PieceType;
  color: Color;
  captured?: PieceType; // piece type captured (including en passant)
  promotion?: PieceType; // Q | R | B | N
  castle?: "K" | "Q"; // kingside / queenside
  enPassant?: boolean; // this move is an en-passant capture
  double?: boolean; // pawn double push (sets ep target)
}

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null; // target square a pawn may move to for en passant
  halfmove: number; // halfmoves since last pawn move or capture (50-move rule)
  fullmove: number;
  history: string[]; // position keys for threefold repetition
}

export type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw-repetition"
  | "draw-fifty"
  | "draw-material";

export type Difficulty = "easy" | "medium" | "hard";

export const PIECE_VALUE: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};
