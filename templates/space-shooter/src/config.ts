/**
 * Central tunables for the space shooter.
 *
 * Everything gameplay-related lives here so the scene code stays readable:
 * tweak numbers/colors in this file only. Sizes are in pixels, speeds in
 * pixels-per-second, velocities in px/s, durations in milliseconds.
 */

/** Canvas/world boot settings, consumed by src/main.ts. */
export const GAME = {
	width: 960,
	height: 540,
	backgroundColor: '#0b0b1a',
	/** This template moves everything via velocity, so no world gravity. */
	gravity: 0,
} as const

/** Player ship settings. */
export const PLAYER = {
	textureKey: 'ship',
	width: 38,
	height: 34,
	color: 0x8be9fd,
	startY: 470,
	/** Horizontal/vertical flight speed with keys held. */
	speed: 320,
	/** Minimum ms between shots while SPACE is held (auto-fire). */
	fireCooldownMs: 220,
	startLives: 3,
} as const

/** Player bullet settings (pooled physics group). */
export const BULLET = {
	textureKey: 'bullet',
	width: 4,
	height: 14,
	color: 0xffe066,
	speed: 640,
	/** Cap for the bullet pool; extras are dropped while exhausted. */
	maxAlive: 40,
} as const

/** Enemy ship settings. */
export const ENEMY = {
	textureKey: 'enemy',
	width: 36,
	height: 28,
	color: 0xff6b8e,
	/** Constant downward drift. */
	descendSpeed: 55,
	/** Horizontal zig-zag amplitude in px/s. */
	swaySpeed: 130,
	/** Sway speed multiplier (roughly radians per second). */
	swayFrequency: 2.4,
	/** An enemy reaching this close to the bottom costs a life. */
	bottomMargin: 30,
	/** Horizontal padding from the screen edges when placing enemies. */
	spawnMargin: 50,
	points: 10,
} as const

/**
 * Wave configuration: wave N spawns `firstCount + (N - 1) * growthPerWave`
 * enemies (capped at maxEnemies).
 */
export const WAVE = {
	firstCount: 5,
	growthPerWave: 2,
	maxEnemies: 24,
	/** Stagger between individual enemy spawns. */
	spawnGapMs: 160,
	/** Delay before wave 2+ spawns start (lets the banner breathe). */
	nextWaveDelayMs: 900,
	bannerHoldMs: 1000,
	bannerFadeMs: 220,
} as const

/** Explosion particle settings (procedural sprite + reused emitter). */
export const EXPLOSION = {
	textureKey: 'spark',
	size: 5,
	radius: 2.5,
	color: 0xffc857,
	speed: {min: 60, max: 240},
	lifespanMs: 480,
	particlesPerBlast: 14,
} as const

/** HUD & end-of-run overlay styling. */
export const HUD = {
	depth: 10,
	overlayDepth: 20,
	fontSize: '20px',
	bannerFontSize: '30px',
	color: '#e8e9f3',
	dangerColor: '#ff6b6b',
	bannerColor: '#9df0ff',
	overlayColor: 0x05060f,
	overlayAlpha: 0.72,
} as const
