/**
 * Central tunables for the brick-breaker.
 *
 * Everything gameplay-related lives here so the scene code stays readable:
 * tweak numbers/colors in this file only. Sizes in pixels, speeds in px/s,
 * durations in milliseconds, angles in degrees.
 */

/** Canvas/world boot settings, consumed by src/main.ts. */
export const GAME = {
  width: 960,
  height: 540,
  backgroundColor: "#101022",
  /** Ball & paddle move purely via velocity; no world gravity. */
  gravity: 0,
} as const;

/** Paddle settings. */
export const PADDLE = {
  textureKey: "paddle",
  width: 120,
  height: 16,
  color: 0x8be9fd,
  /** Distance of the paddle centre from the bottom edge. */
  bottomMargin: 44,
  /** Keyboard steering speed (px/s) with arrows or A / D held. */
  keyboardSpeed: 620,
  /** Furthest deflection from straight-up when hitting the paddle edge. */
  maxBounceAngleDeg: 60,
} as const;

/** Ball settings. */
export const BALL = {
  textureKey: "ball",
  size: 14,
  color: 0xffffff,
  /** Constant total travel speed while flying. */
  speed: 380,
  /** Random launch-angle spread (degrees) so rounds differ. */
  launchSpreadDeg: 15,
  /** Pause between losing a life and the next serve. */
  respawnDelayMs: 700,
} as const;

/** Brick wall layout; row colors & points are indexed from the top row. */
export const BRICK = {
  textureKey: "brick",
  rows: 5,
  columns: 10,
  width: 76,
  height: 22,
  gapX: 8,
  gapY: 8,
  /** Distance from the canvas top to the first brick row. */
  topOffset: 76,
  colors: [0xff6b6b, 0xffb86c, 0xffe066, 0x9df0ff, 0xb591f6],
  points: [50, 40, 30, 20, 10],
} as const;

/** Rule tunables: player lives. */
export const PLAYER = {
  startLives: 3,
} as const;

/** HUD & end-screen styling. */
export const HUD = {
  depth: 10,
  overlayDepth: 20,
  fontSize: "20px",
  titleFontSize: "34px",
  color: "#e8e9f3",
  winColor: "#9df0ff",
  dangerColor: "#ff6b6b",
  overlayColor: 0x05060f,
  overlayAlpha: 0.72,
} as const;
