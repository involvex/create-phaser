import * as Phaser from 'phaser'
import {COLORS} from '../config'

/**
 * BootScene bakes every texture the platformer needs with
 * Graphics.generateTexture(), then hands over to GameScene.
 *
 * No image/audio files anywhere: change COLORS in config.ts and every
 * texture regenerates from code on the next boot.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super('Boot')
	}

	create(): void {
		this.createPlayerTexture()
		this.createGroundTexture()
		this.createPlatformTexture()
		this.createCoinTexture()
		this.createEnemyTexture()

		// Everything is ready - start the game.
		this.scene.start('Game')
	}

	/** Bake a Graphics drawing into a named texture, then dispose of it. */
	private bake(
		key: string,
		g: Phaser.GameObjects.Graphics,
		width: number,
		height: number,
	): void {
		g.generateTexture(key, width, height)
		g.destroy()
	}

	/** 32x32 rounded player square with a shaded bottom half. */
	private createPlayerTexture(): void {
		const g = this.add.graphics()
		g.fillStyle(COLORS.player, 1)
		g.fillRoundedRect(0, 0, 32, 32, 6)
		g.fillStyle(COLORS.playerBottom, 1)
		g.fillRect(4, 20, 24, 8)
		this.bake('player', g, 32, 32)
	}

	/** 64x20 ground strip, stretched to each segment width in GameScene. */
	private createGroundTexture(): void {
		const g = this.add.graphics()
		g.fillStyle(COLORS.ground, 1)
		g.fillRect(0, 0, 64, 20)
		g.fillStyle(COLORS.groundTop, 1)
		g.fillRect(0, 0, 64, 4)
		this.bake('ground', g, 64, 20)
	}

	/** 96x24 rounded gray platform bar, stretched to each platform width. */
	private createPlatformTexture(): void {
		const g = this.add.graphics()
		g.fillStyle(COLORS.platform, 1)
		g.fillRoundedRect(0, 0, 96, 24, 8)
		g.fillStyle(COLORS.platformTop, 1)
		g.fillRoundedRect(4, 3, 88, 6, 3)
		this.bake('platform', g, 96, 24)
	}

	/** 20x20 gold coin circle with a small shine dot. */
	private createCoinTexture(): void {
		const g = this.add.graphics()
		g.fillStyle(COLORS.coin, 1)
		g.fillCircle(10, 10, 9)
		g.fillStyle(COLORS.coinShine, 1)
		g.fillCircle(7, 7, 2)
		this.bake('coin', g, 20, 20)
	}

	/** 36x36 purple enemy square with googly eyes. */
	private createEnemyTexture(): void {
		const g = this.add.graphics()
		g.fillStyle(COLORS.enemy, 1)
		g.fillRect(0, 0, 36, 36)
		g.fillStyle(COLORS.enemyEyes, 1)
		g.fillCircle(11, 14, 6)
		g.fillCircle(25, 14, 6)
		g.fillStyle(COLORS.enemyPupils, 1)
		g.fillCircle(12, 15, 2.5)
		g.fillCircle(26, 15, 2.5)
		this.bake('enemy', g, 36, 36)
	}
}
