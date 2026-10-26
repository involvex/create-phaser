import * as Phaser from 'phaser'
import {COLORS} from '../config'

/**
 * BootScene runs first. Its only jobs:
 *   1. Generate procedural textures (no image files needed!)
 *   2. Hand over to the actual game scene.
 *
 * Add more `createXxxTexture()` helpers here as your game grows; Phaser bakes
 * any Graphics drawing into a reusable texture with `generateTexture()`.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super('Boot')
	}

	create(): void {
		this.createTextures()

		// Everything is ready - start the game.
		this.scene.start('Game')
	}

	/**
	 * Two example textures: a white square and a blue square.
	 *
	 * Draw at (0, 0), bake with generateTexture(key, width, height), then
	 * destroy() the Graphics - the texture stays available forever.
	 */
	private createTextures(): void {
		this.makeSquare('square', COLORS.square)
		this.makeSquare('square-alt', COLORS.squareAlt)
	}

	private makeSquare(key: string, color: number): void {
		const size = 24
		const g = this.add.graphics()
		g.fillStyle(color, 1)
		g.fillRect(0, 0, size, size)
		g.generateTexture(key, size, size)
		g.destroy()
	}
}
