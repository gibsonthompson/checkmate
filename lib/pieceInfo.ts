import { PieceType } from "./types";

export interface PieceMeta {
  name: string;
  symbol: string; // letter used in notation ("" for pawn)
  value: number; // 0 = priceless (King)
  moves: string; // how it moves, in plain language
  role: string; // what it's for
  fact: string; // a memorable extra detail
}

export const PIECE_INFO: Record<PieceType, PieceMeta> = {
  K: {
    name: "King",
    symbol: "K",
    value: 0,
    moves: "One square in any direction. Can never move onto a square that's under attack.",
    role: "The piece you must protect — if it's trapped (checkmate), you lose. Keep it safe early by castling.",
    fact: "In the endgame, with fewer pieces around, the King turns into a strong attacker.",
  },
  Q: {
    name: "Queen",
    symbol: "Q",
    value: 9,
    moves: "Any number of squares in a straight line — horizontally, vertically, or diagonally.",
    role: "Your most powerful piece. It combines the Rook and Bishop, attacking on many lines at once.",
    fact: "Don't bring her out too early — enemy minor pieces will chase her and gain time.",
  },
  R: {
    name: "Rook",
    symbol: "R",
    value: 5,
    moves: "Any number of squares horizontally or vertically (in straight lines).",
    role: "A heavy piece that dominates open files and the opponent's back ranks.",
    fact: "Two Rooks doubled on an open file are crushing. Rooks also castle with the King.",
  },
  B: {
    name: "Bishop",
    symbol: "B",
    value: 3,
    moves: "Any number of squares diagonally.",
    role: "A long-range piece that rakes across open diagonals. Each Bishop stays on one colour all game.",
    fact: "Having both Bishops (the 'Bishop pair') is a real edge in open positions.",
  },
  N: {
    name: "Knight",
    symbol: "N",
    value: 3,
    moves: "In an 'L': two squares one way, then one square at a right angle. It can jump over other pieces.",
    role: "A tricky short-range attacker that's deadly in closed positions and loves forks.",
    fact: "The only piece that can leap over others — and the only one that always changes square colour.",
  },
  P: {
    name: "Pawn",
    symbol: "",
    value: 1,
    moves: "Forward one square (or two from its start). Captures only diagonally forward. Never moves backward.",
    role: "The foot soldier that defines the structure of the position. Use pawns to claim space.",
    fact: "Reach the far side and it promotes — usually to a Queen, the game's biggest swing.",
  },
};
