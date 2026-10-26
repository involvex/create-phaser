/**
 * Shared configuration for the 2D platformer template.
 * All gameplay tunables live here - tweak and re-run `bun run dev`.
 */

/** Canvas / camera setup, read by main.ts and GameScene. */
export const GAME = {
	width: 960,
	height: 540,
	backgroundColor: '#8fc7e8',
	/** Arcade gravity pulling bodies down (px/s^2). */
	gravity: 1200,
	/** The world is wider than the viewport so the camera can scroll. */
	worldWidth: 1920,
}

/**
 * The template palette.
 *
 * Colors come in two flavors on purpose:
 * - `0x` hex numbers feed Phaser.GameObjects.Graphics (fillStyle/lineStyle)
 * - `"#..."` strings feed Phaser display object styles such as Text color
 */
export const COLORS = {
	player: 0xff7043,
	playerBottom: 0xd95528,
	ground: 0x5a6472,
	groundTop: 0x8d97a5,
	platform: 0x6d7889,
	platformTop: 0x9aa5b5,
	coin: 0xffd23f,
	coinShine: 0xfff3b0,
	enemy: 0x9b5de5,
	enemyEyes: 0xffffff,
	enemyPupils: 0x2b2b3a,
	hudText: '#ffffff',
	hudHint: '#dfeaf5',
	popText: '#ffd23f',
}

/** Player movement tunables. `size` must match the generated player texture. */
export const PLAYER = {
	size: 32,
	speed: 240,
	jumpVelocity: -640,
}

/** Level layout. `x` = left edge, `y` = top edge, `w` = width (px). */
export const LEVEL = {
	/** Where the player spawns (sprite center). */
	start: {x: 100, y: 460},
	/** Ground strips along the bottom; the gaps between them are pits. */
	ground: [
		{x: 0, w: 760},
		{x: 900, w: 500},
		{x: 1560, w: 360},
	],
	groundH: 20,
	/** Floating platforms. */
	platforms: [
		{x: 250, y: 420, w: 160},
		{x: 470, y: 330, w: 140},
		{x: 960, y: 400, w: 180},
		{x: 1180, y: 300, w: 150},
		{x: 1430, y: 250, w: 130},
		{x: 1680, y: 380, w: 170},
	],
	platformH: 24,
	/** Coins floating above the ground and over each platform. */
	coins: [
		{x: 300, y: 488},
		{x: 1000, y: 488},
		{x: 1750, y: 488},
		{x: 330, y: 390},
		{x: 540, y: 300},
		{x: 1050, y: 370},
		{x: 1255, y: 270},
		{x: 1495, y: 220},
		{x: 1765, y: 350},
	],
	/**
	 * One enemy patrolling the middle ground strip. `speed` in px/s;
	 * minX/maxX bound the enemy's center so it never walks off its strip.
	 */
	enemy: {x: 1150, y: 500, speed: 90, minX: 950, maxX: 1350},
}
