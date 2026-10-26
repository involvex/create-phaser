import * as Phaser from 'phaser'
import {GAME} from './config'
import {BootScene} from './scenes/BootScene'
import {GameScene} from './scenes/GameScene'

/**
 * Phaser entry point.
 *
 * The arcade physics engine supplies gravity for the player and the enemy;
 * gameplay lives in the scene list below (BootScene runs first and bakes the
 * procedural textures GameScene uses).
 */
new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'app',
	width: GAME.width,
	height: GAME.height,
	backgroundColor: GAME.backgroundColor,
	scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
	physics: {
		default: 'arcade',
		arcade: {gravity: {x: 0, y: GAME.gravity}, debug: false},
	},
	scene: [BootScene, GameScene],
})
