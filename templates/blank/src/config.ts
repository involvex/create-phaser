/**
 * Shared configuration for the blank starter.
 *
 * Keep every tunable here so scenes stay small: canvas size, palette and
 * anything gameplay related can be adjusted in one place.
 */

/** The game window as Phaser receives it (used by `new Phaser.Game`). */
export const GAME = {
  width: 960,
  height: 540,
  backgroundColor: "#15161c",
};

/**
 * The template palette.
 *
 * Colors come in two flavors on purpose:
 * - `0x` hex numbers feed Phaser.GameObjects.Graphics (fillStyle/setTint)
 * - `"#..."` strings feed Phaser display object styles such as Text color
 */
export const COLORS = {
  square: 0xffffff,
  squareAlt: 0x4d9fff,
  headline: "#ffd166",
  text: "#f2f4ff",
  muted: "#98a0b8",
};
