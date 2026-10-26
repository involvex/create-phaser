import * as Phaser from 'phaser'
import {GAME} from './config'
import {GameScene} from './scenes/GameScene'

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
	scene: [GameScene],
})
