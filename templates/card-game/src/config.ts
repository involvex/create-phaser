/**
 * Shared configuration for the memory-match card game.
 * Layout, timing and palette all live here - tweak and re-run `bun run dev`.
 */

/** Canvas setup, read by main.ts and GameScene. */
export const GAME = {
  width: 960,
  height: 540,
  backgroundColor: "#15161c",
};

/** Card grid layout: 4 columns x 3 rows = 12 cards for 6 pairs. */
export const SIZE = {
  cols: 4,
  rows: 3,
  cardW: 110,
  cardH: 150,
  gapX: 26,
  gapY: 22,
};

/** The six face symbols; two of each are shuffled into every deal. */
export const SYMBOLS = ["♠", "♣", "♥", "♦", "★", "✿"];

/** Text colors per symbol (same index order as SYMBOLS). */
export const SYMBOL_COLORS = [
  "#26313f",
  "#26313f",
  "#c0392b",
  "#c0392b",
  "#c9960d",
  "#178f82",
];

/** Palette for the HUD and the generated card textures. */
export const COLORS = {
  hudText: "#f2f4ff",
  mutedText: "#8a91a8",
  winText: "#ffd166",
  cardBack: 0x3d4662,
  cardBackBorder: 0x93a8cf,
  cardBackInner: 0x5a6a92,
  cardFace: 0xf4f6fb,
  cardFaceBorder: 0x92a3c4,
  winVeil: 0x0d1017,
};

/** Animation + decision timing (ms). */
export const TIMING = {
  /** One half of a flip: squash flat, then unsquash. */
  flipMs: 170,
  /** How long a mismatched pair stays face-up before flipping back. */
  mismatchMs: 600,
  /** The little scale "pop" when a match locks in. */
  popMs: 160,
};
