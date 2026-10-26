/**
 * Central tunables for the top-down arena shooter.
 *
 * Everything gameplay-related lives here so the scene code stays readable:
 * tweak numbers/colors in this file only. Sizes in pixels, speeds in px/s,
 * durations in milliseconds, angles in radians where noted.
 */

/** Canvas/world boot settings, consumed by src/main.ts. */
export const GAME = {
  width: 960,
  height: 540,
  backgroundColor: "#10151c",
  /** Top-down play: no gravity at all, everything is velocity-based. */
  gravity: 0,
} as const;

/** Arena border walls, drawn flush with the screen edges. */
export const WALL = {
  textureKeyHorizontal: "wallHorizontal",
  textureKeyVertical: "wallVertical",
  thickness: 24,
  color: 0x3f4d63,
} as const;

/** Player settings. */
export const PLAYER = {
  textureKey: "player",
  size: 30,
  color: 0x8be9fd,
  /** Movement speed with a movement key held. */
  speed: 260,
  maxHp: 5,
  /** Invulnerability window (ms) after taking a hit, with a blink. */
  invulnerabilityMs: 900,
  /** Enemies never spawn closer than this to the player. */
  safeSpawnDistance: 150,
} as const;

/** Player bullet settings (pooled physics group). */
export const BULLET = {
  textureKey: "bullet",
  size: 8,
  color: 0xffe066,
  speed: 520,
  /** Minimum ms between shots while firing input is held. */
  cooldownMs: 160,
  /** Cap for the bullet pool; extra shots are dropped while exhausted. */
  maxAlive: 40,
  /** Spawn distance ahead of the player centre, so shots start clear. */
  barrelDistance: 26,
} as const;

/** Enemy settings. */
export const ENEMY = {
  textureKey: "enemy",
  size: 26,
  color: 0xff6b8e,
  /** Pursuit speed in wave 1. */
  speed: 110,
  /** Extra px/s per wave. */
  speedGrowthPerWave: 8,
  points: 10,
} as const;

/**
 * Wave configuration: wave N spawns `firstCount + (N - 1) * growthPerWave`
 * enemies (capped at maxEnemies).
 */
export const WAVE = {
  firstCount: 3,
  growthPerWave: 2,
  maxEnemies: 21,
  /** Stagger between individual enemy spawns. */
  spawnGapMs: 240,
  /** Delay before wave 2+ spawns start (lets the banner breathe). */
  nextWaveDelayMs: 700,
  bannerHoldMs: 1000,
  bannerFadeMs: 220,
} as const;

/** Explosion particle settings (procedural sprite + reused emitter). */
export const EXPLOSION = {
  textureKey: "spark",
  size: 5,
  radius: 2.5,
  color: 0xffc857,
  speed: { min: 60, max: 240 },
  lifespanMs: 480,
  particlesPerBlast: 12,
} as const;

/** HUD & end-of-run overlay styling. */
export const HUD = {
  depth: 10,
  overlayDepth: 20,
  fontSize: "20px",
  bannerFontSize: "30px",
  color: "#e8e9f3",
  dangerColor: "#ff6b6b",
  bannerColor: "#9df0ff",
  overlayColor: 0x05060f,
  overlayAlpha: 0.72,
  /** HP bar geometry (drawn top-left) and colors. */
  hpBarX: 16,
  hpBarY: 26,
  hpBarWidth: 160,
  hpBarHeight: 14,
  hpBarTrackColor: 0x1d2433,
  hpBarFillColor: 0x70e28a,
} as const;
