import { Color, GameState, PieceType, Square } from "./types";
import { positionKey } from "./engine";
import { Board } from "./types";

export interface TutorialDiagram {
  highlights?: Square[];
  pieces?: { sq: Square; type: PieceType; color: Color }[];
  arrows?: { from: Square; to: Square }[];
  caption?: string;
}

export interface IntroStep {
  kind: "intro";
  title: string;
  icon: string;
  body: string[];
  diagram?: TutorialDiagram;
}

export interface PieceStep {
  kind: "piece";
  piece: PieceType;
  title: string;
  from: Square; // where the demo piece sits
  enemies?: Square[]; // enemy pawns/pieces to demonstrate captures
  blurb: string;
  howItMoves: string;
  strategy: string;
  value: number;
}

export type TutorialStep = IntroStep | PieceStep;

export const PIECE_GLYPH: Record<PieceType, { white: string; black: string }> = {
  K: { white: "♔", black: "♚" },
  Q: { white: "♕", black: "♛" },
  R: { white: "♖", black: "♜" },
  B: { white: "♗", black: "♝" },
  N: { white: "♘", black: "♞" },
  P: { white: "♙", black: "♟" },
};

export const TUTORIAL: TutorialStep[] = [
  {
    kind: "intro",
    title: "Welcome to Chess",
    icon: "♔",
    body: [
      "Chess is a duel of ideas played by two armies on an 8×8 board. White always moves first, then players alternate.",
      "Your goal is to checkmate the enemy King — trap it so that it is under attack and has no legal way to escape.",
      "Over the next few screens you'll learn the board, every piece, the special moves, and the core principles. Then you'll play a real game with a coach explaining everything.",
    ],
  },
  {
    kind: "intro",
    title: "The Board",
    icon: "▦",
    body: [
      "The 64 squares alternate light and dark. Vertical columns are 'files', labelled a–h. Horizontal rows are 'ranks', numbered 1–8.",
      "Every square has a unique name from its file and rank, like e4 or c6. You'll see these coordinates around the board during play.",
      "A quick check: the square in each player's bottom-right corner is always light. 'Light on the right.'",
    ],
    diagram: {
      highlights: [
        [3, 3],
        [3, 4],
        [4, 3],
        [4, 4],
      ],
      caption: "Files run a–h left to right; ranks 1–8 bottom to top. The four highlighted centre squares (d4, e4, d5, e5) are the most valuable real estate on the board.",
    },
  },
  {
    kind: "piece",
    piece: "P",
    title: "The Pawn",
    from: [4, 4],
    enemies: [
      [3, 3],
      [3, 5],
    ],
    value: 1,
    blurb: "The foot soldier. Small, but pawns define the structure of the whole game.",
    howItMoves:
      "Moves straight forward one square — or two squares from its starting position. It captures only diagonally forward (shown by the highlighted enemies). Reaching the far side promotes it to any piece, usually a Queen.",
    strategy:
      "Pawns can't move backward, so every push is permanent. Use them to claim the centre, and avoid leaving them doubled or isolated.",
  },
  {
    kind: "piece",
    piece: "N",
    title: "The Knight",
    from: [4, 4],
    value: 3,
    blurb: "The trickster. The only piece that leaps over others.",
    howItMoves:
      "Moves in an 'L': two squares one way, then one square at a right angle. It can jump over anything in between, landing on the highlighted squares.",
    strategy:
      "Knights are strongest near the centre and in closed positions. Look for forks — a single Knight can attack two pieces at once.",
  },
  {
    kind: "piece",
    piece: "B",
    title: "The Bishop",
    from: [4, 4],
    value: 3,
    blurb: "The sniper. Rules the diagonals.",
    howItMoves:
      "Slides any number of squares diagonally until blocked. Each Bishop stays on one colour for the entire game.",
    strategy:
      "Having both Bishops (the 'Bishop pair') is powerful in open positions. Place them on long, unobstructed diagonals.",
  },
  {
    kind: "piece",
    piece: "R",
    title: "The Rook",
    from: [4, 4],
    value: 5,
    blurb: "The battering ram. Loves straight lines.",
    howItMoves:
      "Slides any number of squares horizontally or vertically until blocked.",
    strategy:
      "Rooks thrive on open files (columns with no pawns) and the 7th rank. Doubling two Rooks on one file is crushing.",
  },
  {
    kind: "piece",
    piece: "Q",
    title: "The Queen",
    from: [4, 4],
    value: 9,
    blurb: "The powerhouse. Rook and Bishop combined.",
    howItMoves:
      "Slides any number of squares in any direction — straight or diagonal. The most mobile piece on the board.",
    strategy:
      "Don't bring her out too early; she gets chased by lesser pieces, costing you time. In the middlegame she creates threats on multiple fronts.",
  },
  {
    kind: "piece",
    piece: "K",
    title: "The King",
    from: [4, 4],
    value: 0,
    blurb: "The heart of the army. Lose him and the game is over.",
    howItMoves:
      "Moves one square in any direction. He can never move into check (an attacked square).",
    strategy:
      "Keep him safe behind pawns in the opening and middlegame — castle early. In the endgame, with fewer pieces around, the King becomes a strong attacker.",
  },
  {
    kind: "intro",
    title: "Special Moves",
    icon: "✦",
    body: [
      "Castling — In one move, the King steps two squares toward a Rook and that Rook hops to the King's other side. It's the fastest way to safety, allowed only if neither piece has moved, the path is clear, and the King isn't moving through check.",
      "En passant — If an enemy pawn uses its two-square jump to slip beside your pawn, you may capture it 'in passing', exactly as if it had moved only one square — but only on the very next move.",
      "Promotion — A pawn that reaches the far rank transforms into any piece you choose. Almost always a Queen, but a Knight can deliver a surprise fork.",
    ],
    diagram: {
      pieces: [
        { sq: [7, 4], type: "K", color: "w" },
        { sq: [7, 7], type: "R", color: "w" },
      ],
      arrows: [
        { from: [7, 4], to: [7, 6] },
        { from: [7, 7], to: [7, 5] },
      ],
      highlights: [
        [7, 6],
        [7, 5],
      ],
      caption: "Castling kingside: the King slides two squares toward the Rook (e1→g1) and the Rook hops over to f1.",
    },
  },
  {
    kind: "intro",
    title: "How to Win",
    icon: "⚔",
    body: [
      "Check means the King is attacked; you must get out of it immediately. Checkmate means there's no legal escape — that ends the game.",
      "Not every game has a winner. A stalemate (no legal move but not in check), threefold repetition, the 50-move rule, or too little material to mate all end in a draw.",
      "Piece values guide trades: Pawn 1, Knight 3, Bishop 3, Rook 5, Queen 9. Win material when you can and protect your own.",
    ],
    diagram: {
      pieces: [
        { sq: [0, 6], type: "K", color: "b" },
        { sq: [1, 5], type: "P", color: "b" },
        { sq: [1, 6], type: "P", color: "b" },
        { sq: [1, 7], type: "P", color: "b" },
        { sq: [0, 0], type: "R", color: "w" },
        { sq: [7, 4], type: "K", color: "w" },
      ],
      arrows: [{ from: [0, 0], to: [0, 6] }],
      highlights: [[0, 6]],
      caption: "A back-rank checkmate: the white Rook attacks all along the 8th rank, and the black King is trapped by its own pawns. King attacked, no escape — game over.",
    },
  },
  {
    kind: "intro",
    title: "The Four Habits",
    icon: "🧠",
    body: [
      "1. Control the centre — fight for e4, d4, e5, d5 with pawns and pieces.",
      "2. Develop quickly — get every Knight and Bishop into the game early.",
      "3. Castle — put your King behind a wall of pawns.",
      "4. Stay alert — every move, ask what your opponent is threatening.",
    ],
    diagram: {
      highlights: [
        [3, 3],
        [3, 4],
        [4, 3],
        [4, 4],
      ],
      caption: "Habit #1 in pictures: fight to control these four centre squares with your pawns and pieces.",
    },
  },
  {
    kind: "intro",
    title: "You're Ready",
    icon: "🏁",
    body: [
      "That's everything you need to start. You'll play White against a coach that explains its own moves, grades yours in real time, and offers a hint whenever you're stuck.",
      "Turn on the learning aids (legal-move dots and the danger highlighter) while you find your feet, then switch them off as you improve. Let's play.",
    ],
  },
];

// Build a minimal game state holding just the demo piece (plus optional enemies)
// so the live engine can compute the exact squares it can reach.
export function buildDemoState(step: PieceStep): GameState {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  board[step.from[0]][step.from[1]] = { type: step.piece, color: "w" };
  if (step.enemies) {
    for (const [r, c] of step.enemies) board[r][c] = { type: "P", color: "b" };
  }
  const state: GameState = {
    board,
    turn: "w",
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
  };
  state.history.push(positionKey(state));
  return state;
}