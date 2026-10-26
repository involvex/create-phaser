import * as Phaser from 'phaser'
import {
	BULLET,
	ENEMY,
	EXPLOSION,
	GAME,
	HUD,
	PLAYER,
	WALL,
	WAVE,
} from '../config'

/**
 * Pooled physics images whose body is always a dynamic Arcade body (pooled
 * members are managed by this scene only, so the body is never null).
 */
type Bullet = Phaser.Physics.Arcade.Image & {
	body: Phaser.Physics.Arcade.Body
}
type Enemy = Phaser.Physics.Arcade.Image & {
	body: Phaser.Physics.Arcade.Body
}

/** Shape of the key map returned by Phaser.Input.Keyboard#addKeys("W,A,S,D"). */
type MoveKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>

/**
 * The single gameplay scene: a walled arena where the player dodges waves
 * of enemies that home in on their target.
 *
 * All visuals are procedural — squares, bullets, walls and explosion sparks
 * are drawn once into small textures with Phaser.GameObjects.Graphics, then
 * re-used by sprite particles and pooled physics images.
 */
export class GameScene extends Phaser.Scene {
	// --- Input -------------------------------------------------------------
	private keys!: MoveKeys
	private fireKey!: Phaser.Input.Keyboard.Key
	private restartKey!: Phaser.Input.Keyboard.Key

	// --- Game objects ------------------------------------------------------
	private player!: Phaser.Physics.Arcade.Image
	private bullets!: Phaser.Physics.Arcade.Group
	private enemies!: Phaser.Physics.Arcade.Group
	private walls!: Phaser.Physics.Arcade.StaticGroup
	private explosion!: Phaser.GameObjects.Particles.ParticleEmitter

	// --- HUD ---------------------------------------------------------------
	private hpBarFill!: Phaser.GameObjects.Rectangle
	private hpText!: Phaser.GameObjects.Text
	private waveText!: Phaser.GameObjects.Text
	private scoreText!: Phaser.GameObjects.Text
	private bannerText!: Phaser.GameObjects.Text

	// --- Run state ---------------------------------------------------------
	private hp = 0
	private score = 0
	private wave = 0
	/** Enemies of the current wave that still have to appear. */
	private pendingSpawns = 0
	/** Pursuit speed for the current wave (grows with each wave). */
	private enemySpeed = 0
	private lastShotAt = Number.NEGATIVE_INFINITY
	private invulnerableUntil = Number.NEGATIVE_INFINITY
	private gameOver = false

	constructor() {
		super('Game')
	}

	create(): void {
		// Reset run state here: the scene *instance* survives a restart, so
		// field initializers would keep stale values from the previous run.
		this.hp = PLAYER.maxHp
		this.score = 0
		this.wave = 0
		this.pendingSpawns = 0
		this.lastShotAt = Number.NEGATIVE_INFINITY
		this.invulnerableUntil = Number.NEGATIVE_INFINITY
		this.gameOver = false

		this.buildTextures()
		this.buildInput()
		this.buildArena()
		this.buildPlayer()
		this.buildGroups()
		this.buildEffects()
		this.buildHud()
		this.setupCollisions()
		this.startWave(1)
	}

	update(time: number, _delta: number): void {
		if (this.gameOver) {
			if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
				this.scene.restart()
			}
			return
		}

		this.movePlayer()
		this.recycleBullets()
		this.updateEnemies()
		this.tryShoot(time)
	}

	// ------------------------------------------------------------------ setup

	/**
	 * Draw every texture once with Phaser.GameObjects.Graphics. Textures live
	 * in the global texture manager, so they survive scene restarts.
	 */
	private buildTextures(): void {
		if (this.textures.exists(PLAYER.textureKey)) {
			return
		}

		const roundedRect = (
			key: string,
			width: number,
			height: number,
			color: number,
			radius: number,
		): void => {
			const graphics = this.add.graphics()
			graphics.fillStyle(color, 1)
			graphics.fillRoundedRect(0, 0, width, height, radius)
			graphics.generateTexture(key, width, height)
			graphics.destroy()
		}

		roundedRect(PLAYER.textureKey, PLAYER.size, PLAYER.size, PLAYER.color, 6)
		roundedRect(ENEMY.textureKey, ENEMY.size, ENEMY.size, ENEMY.color, 4)
		roundedRect(
			WALL.textureKeyHorizontal,
			GAME.width,
			WALL.thickness,
			WALL.color,
			0,
		)
		roundedRect(
			WALL.textureKeyVertical,
			WALL.thickness,
			GAME.height,
			WALL.color,
			0,
		)

		// Bullets: tiny round shots.
		const bullet = this.add.graphics()
		bullet.fillStyle(BULLET.color, 1)
		bullet.fillCircle(BULLET.size / 2, BULLET.size / 2, BULLET.size / 2)
		bullet.generateTexture(BULLET.textureKey, BULLET.size, BULLET.size)
		bullet.destroy()

		// Explosion sparks: tiny circles, re-used by the particle emitter.
		const spark = this.add.graphics()
		spark.fillStyle(EXPLOSION.color, 1)
		spark.fillCircle(EXPLOSION.size / 2, EXPLOSION.size / 2, EXPLOSION.radius)
		spark.generateTexture(EXPLOSION.textureKey, EXPLOSION.size, EXPLOSION.size)
		spark.destroy()
	}

	private buildInput(): void {
		const keyboard = this.input.keyboard
		if (!keyboard) {
			throw new Error('This game requires keyboard input')
		}
		this.keys = keyboard.addKeys('W,A,S,D') as MoveKeys
		this.fireKey = keyboard.addKey('SPACE')
		this.restartKey = keyboard.addKey('R')

		// A click restarts the game from the game-over overlay.
		this.input.on('pointerdown', () => {
			if (this.gameOver) {
				this.scene.restart()
			}
		})
	}

	private buildArena(): void {
		this.walls = this.physics.add.staticGroup()
		const thickness = WALL.thickness
		// Four borders, half sunk into the screen edges.
		this.walls.create(GAME.width / 2, thickness / 2, WALL.textureKeyHorizontal)
		this.walls.create(
			GAME.width / 2,
			GAME.height - thickness / 2,
			WALL.textureKeyHorizontal,
		)
		this.walls.create(thickness / 2, GAME.height / 2, WALL.textureKeyVertical)
		this.walls.create(
			GAME.width - thickness / 2,
			GAME.height / 2,
			WALL.textureKeyVertical,
		)
	}

	private buildPlayer(): void {
		this.player = this.physics.add.image(
			GAME.width / 2,
			GAME.height / 2,
			PLAYER.textureKey,
		)
	}

	private buildGroups(): void {
		// Pooled groups: members are toggled active/inactive instead of being
		// destroyed, so no gameplay object is ever re-allocated mid-run.
		this.bullets = this.physics.add.group({
			defaultKey: BULLET.textureKey,
			maxSize: BULLET.maxAlive,
		})
		this.enemies = this.physics.add.group({
			defaultKey: ENEMY.textureKey,
			maxSize: WAVE.maxEnemies,
		})
	}

	private buildEffects(): void {
		// One parked particle emitter: every explosion re-arms it with
		// emitParticleAt() instead of creating a fresh emitter per kill.
		this.explosion = this.add.particles(0, 0, EXPLOSION.textureKey, {
			speed: EXPLOSION.speed,
			lifespan: EXPLOSION.lifespanMs,
			scale: {start: 1, end: 0},
			emitting: false,
		})
		this.explosion.setDepth(HUD.depth - 1)
	}

	private buildHud(): void {
		const hudStyle = {
			fontFamily: 'monospace',
			fontSize: HUD.fontSize,
			color: HUD.color,
		}

		// HP bar: a dark track under a fill scaled to the remaining health.
		this.add
			.rectangle(
				HUD.hpBarX,
				HUD.hpBarY,
				HUD.hpBarWidth,
				HUD.hpBarHeight,
				HUD.hpBarTrackColor,
			)
			.setOrigin(0, 0.5)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.hpBarFill = this.add
			.rectangle(
				HUD.hpBarX,
				HUD.hpBarY,
				HUD.hpBarWidth,
				HUD.hpBarHeight,
				HUD.hpBarFillColor,
			)
			.setOrigin(0, 0.5)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.hpText = this.add
			.text(HUD.hpBarX + HUD.hpBarWidth + 10, HUD.hpBarY, '', hudStyle)
			.setOrigin(0, 0.5)
			.setScrollFactor(0)
			.setDepth(HUD.depth)

		this.waveText = this.add
			.text(GAME.width / 2, 14, '', hudStyle)
			.setOrigin(0.5, 0)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.scoreText = this.add
			.text(GAME.width - 16, 14, '', hudStyle)
			.setOrigin(1, 0)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.bannerText = this.add
			.text(GAME.width / 2, GAME.height / 3, '', {
				fontFamily: 'monospace',
				fontSize: HUD.bannerFontSize,
				color: HUD.bannerColor,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
			.setAlpha(0)
		this.updateHud()
	}

	private setupCollisions(): void {
		// The player and the enemies stay inside the walled arena.
		this.physics.add.collider(this.player, this.walls)
		this.physics.add.collider(this.enemies, this.walls)
		// Enemies nudge each other around instead of stacking up.
		this.physics.add.collider(this.enemies, this.enemies)
		// Bullets are spent on walls, so they cannot leave the arena.
		this.physics.add.collider(this.bullets, this.walls, object1 => {
			const bullet = object1 as Bullet
			if (bullet.active) {
				this.killBullet(bullet)
			}
		})

		// Bullet hits enemy: kill both, burst, score.
		this.physics.add.overlap(this.bullets, this.enemies, (object1, object2) => {
			const bullet = object1 as Bullet
			const enemy = object2 as Enemy
			if (!bullet.active || !enemy.active) {
				return
			}
			this.killBullet(bullet)
			this.killEnemy(enemy)
			this.explosion.emitParticleAt(
				enemy.x,
				enemy.y,
				EXPLOSION.particlesPerBlast,
			)
			this.score += ENEMY.points
			this.scoreText.setText(`Score ${this.score}`)
			this.checkWaveComplete()
		})

		// Enemy touches player: one HP, with a short invulnerability blink.
		this.physics.add.overlap(this.enemies, this.player, _object1 => {
			const time = this.time.now
			if (this.gameOver || time < this.invulnerableUntil) {
				return
			}
			this.invulnerableUntil = time + PLAYER.invulnerabilityMs
			this.blinkPlayer()
			this.hp -= 1
			this.updateHud()
			this.cameras.main.shake(140, 0.008)
			if (this.hp <= 0) {
				this.endGame()
			}
		})
	}

	// ------------------------------------------------------------- game flow

	/**
	 * Kick off a wave: scale its size & speed from the wave number and
	 * stagger the spawns along the arena edges.
	 */
	private startWave(waveNumber: number): void {
		if (this.gameOver) {
			return
		}
		this.wave = waveNumber
		this.enemySpeed = ENEMY.speed + (waveNumber - 1) * ENEMY.speedGrowthPerWave
		const count = Math.min(
			WAVE.firstCount + (waveNumber - 1) * WAVE.growthPerWave,
			WAVE.maxEnemies,
		)
		this.pendingSpawns = count

		if (waveNumber > 1) {
			this.showBanner(`Wave ${waveNumber}`)
		}
		const startDelay = waveNumber > 1 ? WAVE.nextWaveDelayMs : 0
		for (let index = 0; index < count; index += 1) {
			const spawnIndex = index
			this.time.delayedCall(startDelay + spawnIndex * WAVE.spawnGapMs, () => {
				this.spawnEnemy(spawnIndex, count)
			})
		}
	}

	/**
	 * Spawn slot #spawnIndex of a `count`-enemy wave. Slots are dealt evenly
	 * around the four edges, flipped to the opposite side if they would pop
	 * in right next to the player.
	 */
	private spawnEnemy(spawnIndex: number, count: number): void {
		if (this.gameOver || this.pendingSpawns <= 0) {
			return
		}
		this.pendingSpawns -= 1

		// Keep spawn centres clear of the wall bands.
		const margin = WALL.thickness + ENEMY.size / 2
		const perEdge = Math.ceil(count / 4)
		const slotsIntoEdge = Math.floor(spawnIndex / 4)
		const along = perEdge === 1 ? 0.5 : (slotsIntoEdge + 0.5) / perEdge
		const spanX = GAME.width - 2 * margin
		const spanY = GAME.height - 2 * margin

		let x = margin
		let y = margin
		switch (spawnIndex % 4) {
			case 0: // top edge
				x = margin + along * spanX
				y = margin
				break
			case 1: // right edge
				x = GAME.width - margin
				y = margin + along * spanY
				break
			case 2: // bottom edge
				x = margin + along * spanX
				y = GAME.height - margin
				break
			default: // left edge
				x = margin
				y = margin + along * spanY
				break
		}
		if (
			Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <
			PLAYER.safeSpawnDistance
		) {
			// Spawned under the player's nose — mirror to the opposite corner.
			x = GAME.width - x
			y = GAME.height - y
		}

		const enemy = this.enemies.get(x, y, ENEMY.textureKey) as Enemy | null
		if (!enemy) {
			return // pool exhausted — should not happen with the default caps
		}
		enemy.setPosition(x, y)
		enemy.setActive(true).setVisible(true)
		enemy.body.enable = true
		enemy.body.reset(x, y)
	}

	/** Announce a wave with a fade-in/hold/fade-out banner. */
	private showBanner(message: string): void {
		this.bannerText.setText(message)
		this.tweens.killTweensOf(this.bannerText)
		this.tweens.add({
			targets: this.bannerText,
			alpha: {from: 0, to: 1},
			duration: WAVE.bannerFadeMs,
			hold: WAVE.bannerHoldMs,
			yoyo: true,
		})
	}

	/** Called after every enemy kill: ends the wave when it is empty. */
	private checkWaveComplete(): void {
		if (this.gameOver || this.pendingSpawns > 0) {
			return
		}
		if (this.enemies.countActive(true) > 0) {
			return
		}
		// Everything from this wave is gone — startWave() shows the next banner
		// and delays its own spawns, giving the player a breather.
		this.startWave(this.wave + 1)
	}

	private endGame(): void {
		if (this.gameOver) {
			return
		}
		this.gameOver = true
		this.physics.world.pause()
		this.player.setAlpha(1)
		this.tweens.killTweensOf(this.player)

		const overlay = this.add
			.rectangle(0, 0, GAME.width, GAME.height, HUD.overlayColor, 0)
			.setOrigin(0)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth)
		this.tweens.add({
			targets: overlay,
			alpha: HUD.overlayAlpha,
			duration: 250,
		})

		this.add
			.text(GAME.width / 2, GAME.height / 2 - 34, 'GAME OVER', {
				fontFamily: 'monospace',
				fontSize: HUD.bannerFontSize,
				color: HUD.dangerColor,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth + 1)
		this.add
			.text(
				GAME.width / 2,
				GAME.height / 2 + 10,
				`Final score ${this.score} — wave ${this.wave}`,
				{
					fontFamily: 'monospace',
					fontSize: HUD.fontSize,
					color: HUD.color,
				},
			)
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth + 1)
		this.add
			.text(
				GAME.width / 2,
				GAME.height / 2 + 44,
				'Press R or click to restart',
				{
					fontFamily: 'monospace',
					fontSize: HUD.fontSize,
					color: HUD.color,
				},
			)
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth + 1)
	}

	// ----------------------------------------------------------------- update

	/** WASD movement, clamped to the arena by wall colliders. */
	private movePlayer(): void {
		const direction = new Phaser.Math.Vector2(
			(this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0),
			(this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0),
		)
		if (direction.lengthSq() > 0) {
			direction.normalize().scale(PLAYER.speed)
		}
		this.player.setVelocity(direction.x, direction.y)
	}

	/** Space held or left mouse button held = keep firing on cooldown. */
	private tryShoot(time: number): void {
		if (time - this.lastShotAt < BULLET.cooldownMs) {
			return
		}
		const pointer = this.input.activePointer as Phaser.Input.Pointer
		if (!this.fireKey.isDown && !pointer.isDown) {
			return
		}
		this.lastShotAt = time
		this.fireBullet()
	}

	private fireBullet(): void {
		const pointer = this.input.activePointer as Phaser.Input.Pointer
		// Aim from the player towards the current pointer position.
		const angle = Phaser.Math.Angle.Between(
			this.player.x,
			this.player.y,
			pointer.worldX,
			pointer.worldY,
		)
		const spawnX = this.player.x + Math.cos(angle) * BULLET.barrelDistance
		const spawnY = this.player.y + Math.sin(angle) * BULLET.barrelDistance

		const bullet = this.bullets.get(
			spawnX,
			spawnY,
			BULLET.textureKey,
		) as Bullet | null
		if (!bullet) {
			return // pool exhausted; the cannon merely pauses a frame
		}
		bullet.setPosition(spawnX, spawnY)
		bullet.setActive(true).setVisible(true)
		bullet.body.enable = true
		bullet.body.reset(spawnX, spawnY)
		bullet.setVelocity(
			Math.cos(angle) * BULLET.speed,
			Math.sin(angle) * BULLET.speed,
		)
	}

	/** Park bullets that left the world so the pool reuses them. */
	private recycleBullets(): void {
		const bullets = this.bullets.getChildren() as Bullet[]
		for (const bullet of bullets) {
			const outside =
				bullet.y < -BULLET.size ||
				bullet.y > GAME.height + BULLET.size ||
				bullet.x < -BULLET.size ||
				bullet.x > GAME.width + BULLET.size
			if (bullet.active && outside) {
				this.killBullet(bullet)
			}
		}
	}

	/** Every enemy homes in on the player at the current wave speed. */
	private updateEnemies(): void {
		const enemies = this.enemies.getChildren() as Enemy[]
		for (const enemy of enemies) {
			if (!enemy.active) {
				continue
			}
			const angle = Phaser.Math.Angle.Between(
				enemy.x,
				enemy.y,
				this.player.x,
				this.player.y,
			)
			enemy.body.velocity.x = Math.cos(angle) * this.enemySpeed
			enemy.body.velocity.y = Math.sin(angle) * this.enemySpeed
		}
	}

	// ---------------------------------------------------------------- helpers

	private killBullet(bullet: Bullet): void {
		bullet.setActive(false).setVisible(false)
		bullet.body.stop()
		bullet.body.enable = false
	}

	private killEnemy(enemy: Enemy): void {
		enemy.setActive(false).setVisible(false)
		enemy.body.stop()
		enemy.body.enable = false
	}

	/** Short alpha blink so the player can visually track the grace period. */
	private blinkPlayer(): void {
		this.tweens.killTweensOf(this.player)
		this.player.setAlpha(1)
		this.tweens.add({
			targets: this.player,
			alpha: 0.25,
			duration: 80,
			yoyo: true,
			repeat: Math.max(Math.floor(PLAYER.invulnerabilityMs / 160) - 1, 0),
			onComplete: () => this.player.setAlpha(1),
		})
	}

	private updateHud(): void {
		this.hpBarFill.scaleX = Math.max(this.hp, 0) / PLAYER.maxHp
		this.hpText.setText(`HP ${Math.max(this.hp, 0)}/${PLAYER.maxHp}`)
		this.hpText.setColor(this.hp <= 2 ? HUD.dangerColor : HUD.color)
		this.waveText.setText(`Wave ${this.wave}`)
		this.scoreText.setText(`Score ${this.score}`)
	}
}
