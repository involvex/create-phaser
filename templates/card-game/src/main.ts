import * as Phaser from 'phaser'
import {GAME} from './config'
import {GameScene} from './scenes/GameScene'

/**
 * Phaser entry point.
 *
 * A memory game needs no physics engine, so the config only wires up scaling
 * and the scene list (GameScene draws all of its own textures).
 */
new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'app',
	width: GAME.width,
	height: GAME.height,
	backgroundColor: GAME.backgroundColor,
	scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH},
	scene: [GameScene],
})
