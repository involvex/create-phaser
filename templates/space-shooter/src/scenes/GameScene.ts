import * as Phaser from 'phaser'
import {BULLET, ENEMY, EXPLOSION, GAME, HUD, PLAYER, WAVE} from '../config'

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
 * The single gameplay scene: waves of enemies drift down the screen while
 * the player dodges and fires straight up.
 *
 * All visuals are procedural — spaceship, bullets, enemies and explosion
 * sparks are drawn once into small textures with Phaser.GameObjects.Graphics,
 * then re-used by sprite particles and pooled physics images.
 */
export class GameScene extends Phaser.Scene {
	// --- Input -------------------------------------------------------------
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private keys!: MoveKeys
	private fireKey!: Phaser.Input.Keyboard.Key
	private restartKey!: Phaser.Input.Keyboard.Key

	// --- Game objects ------------------------------------------------------
	private player!: Phaser.Physics.Arcade.Image
	private bullets!: Phaser.Physics.Arcade.Group
	private enemies!: Phaser.Physics.Arcade.Group
	private explosion!: Phaser.GameObjects.Particles.ParticleEmitter

	// --- HUD ---------------------------------------------------------------
	private hpText!: Phaser.GameObjects.Text
	private scoreText!: Phaser.GameObjects.Text
	private bannerText!: Phaser.GameObjects.Text

	// --- Run state ---------------------------------------------------------
	private lives = 0
	private score = 0
	private wave = 0
	/** Enemies of the current wave that still have to appear. */
	private pendingSpawns = 0
	private lastShotAt = Number.NEGATIVE_INFINITY
	private gameOver = false

	constructor() {
		super('Game')
	}

	create(): void {
		// Reset run state here: the scene *instance* survives a restart, so
		// field initializers would keep stale values from the previous run.
		this.lives = PLAYER.startLives
		this.score = 0
		this.wave = 0
		this.pendingSpawns = 0
		this.lastShotAt = Number.NEGATIVE_INFINITY
		this.gameOver = false

		this.buildTextures()
		this.buildInput()
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

		this.movePlayer(time)
		this.recycleBullets()
		this.updateEnemies(time)
	}

	// ------------------------------------------------------------------ setup

	/**
	 * Draw every texture once with Phaser.GameObjects.Graphics. Textures live
	 * in the global texture manager, so they survive scene restarts — building
	 * them again would simply overwrite identical content, but skipping it
	 * keeps restarts snappy.
	 */
	private buildTextures(): void {
		if (this.textures.exists(PLAYER.textureKey)) {
			return
		}

		// Player: a little triangle pointing up.
		const ship = this.add.graphics()
		ship.fillStyle(PLAYER.color, 1)
		ship.beginPath()
		ship.moveTo(PLAYER.width / 2, 0)
		ship.lineTo(PLAYER.width, PLAYER.height)
		ship.lineTo(0, PLAYER.height)
		ship.closePath()
		ship.fillPath()
		ship.generateTexture(PLAYER.textureKey, PLAYER.width, PLAYER.height)
		ship.destroy()

		// Player bullets: small yellow rectangles.
		const bullet = this.add.graphics()
		bullet.fillStyle(BULLET.color, 1)
		bullet.fillRect(0, 0, BULLET.width, BULLET.height)
		bullet.generateTexture(BULLET.textureKey, BULLET.width, BULLET.height)
		bullet.destroy()

		// Enemies: triangles pointing down, drawn top-right to bottom.
		const enemy = this.add.graphics()
		enemy.fillStyle(ENEMY.color, 1)
		enemy.beginPath()
		enemy.moveTo(ENEMY.width, 0)
		enemy.lineTo(ENEMY.width / 2, ENEMY.height)
		enemy.lineTo(0, 0)
		enemy.closePath()
		enemy.fillPath()
		enemy.generateTexture(ENEMY.textureKey, ENEMY.width, ENEMY.height)
		enemy.destroy()

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
		this.cursors = keyboard.createCursorKeys()
		this.keys = keyboard.addKeys('W,A,S,D') as MoveKeys
		this.fireKey = keyboard.addKey('SPACE')
		this.restartKey = keyboard.addKey('R')
	}

	private buildPlayer(): void {
		this.player = this.physics.add.image(
			GAME.width / 2,
			PLAYER.startY,
			PLAYER.textureKey,
		)
		// collideWorldBounds clamps the ship to the visible canvas for free.
		this.player.setCollideWorldBounds(true)
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
		this.hpText = this.add
			.text(16, 14, '', hudStyle)
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
	}

	// ------------------------------------------------------------- game flow

	/**
	 * Kick off a wave: build it from the config counts and stagger the spawns
	 * so the formation slides onto the screen instead of popping in at once.
	 */
	private startWave(waveNumber: number): void {
		if (this.gameOver) {
			return
		}
		this.wave = waveNumber
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

	/** Spawn slot #spawnIndex of a wave that is `count` enemies wide. */
	private spawnEnemy(spawnIndex: number, count: number): void {
		if (this.gameOver || this.pendingSpawns <= 0) {
			return
		}
		this.pendingSpawns -= 1

		const usableWidth = GAME.width - 2 * ENEMY.spawnMargin
		const spacing = count > 1 ? usableWidth / (count - 1) : 0
		const x = ENEMY.spawnMargin + spawnIndex * spacing
		// A random phase offset keeps the zig-zag out of lockstep.
		const sway = Phaser.Math.FloatBetween(0, Math.PI * 2)

		const enemy = this.enemies.get(
			x,
			-ENEMY.height,
			ENEMY.textureKey,
		) as Enemy | null
		if (!enemy) {
			return // pool exhausted — should not happen with the default caps
		}
		enemy.setPosition(x, -ENEMY.height)
		enemy.setActive(true).setVisible(true)
		enemy.body.enable = true
		enemy.body.reset(x, -ENEMY.height)
		enemy.setData('sway', sway)
	}

	/** Announce a wave/score milestone with a fade-in/hold/fade-out banner. */
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

	/** Called after every enemy kill/escape: ends the wave when it is empty. */
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
			.text(GAME.width / 2, GAME.height / 2 + 44, 'Press R to restart', {
				fontFamily: 'monospace',
				fontSize: HUD.fontSize,
				color: HUD.color,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth + 1)
	}

	// ----------------------------------------------------------------- update

	/** Keyboard flight + auto-fire with the configured cooldown. */
	private movePlayer(time: number): void {
		const left = this.cursors.left.isDown || this.keys.A.isDown
		const right = this.cursors.right.isDown || this.keys.D.isDown
		const up = this.cursors.up.isDown || this.keys.W.isDown
		const down = this.cursors.down.isDown || this.keys.S.isDown
		const direction = new Phaser.Math.Vector2(
			(right ? 1 : 0) - (left ? 1 : 0),
			(down ? 1 : 0) - (up ? 1 : 0),
		)
		if (direction.lengthSq() > 0) {
			direction.normalize().scale(PLAYER.speed)
		}
		this.player.setVelocity(direction.x, direction.y)

		if (
			this.fireKey.isDown &&
			time - this.lastShotAt >= PLAYER.fireCooldownMs
		) {
			this.lastShotAt = time
			this.fireBullet()
		}
	}

	private fireBullet(): void {
		const bullet = this.bullets.get(
			this.player.x,
			this.player.y - PLAYER.height / 2,
			BULLET.textureKey,
		) as Bullet | null
		if (!bullet) {
			return // pool exhausted; the cannon merely pauses a frame
		}
		bullet.setPosition(this.player.x, this.player.y - PLAYER.height / 2)
		bullet.setActive(true).setVisible(true)
		bullet.body.enable = true
		bullet.body.reset(bullet.x, bullet.y)
		bullet.setVelocityY(-BULLET.speed)
	}

	/** Park bullets that left the top of the world so the pool reuses them. */
	private recycleBullets(): void {
		const bullets = this.bullets.getChildren() as Bullet[]
		for (const bullet of bullets) {
			if (bullet.active && bullet.y < -BULLET.height) {
				this.killBullet(bullet)
			}
		}
	}

	/** Straight descent plus a sine sway on top = the classic zig-zag. */
	private updateEnemies(time: number): void {
		const enemies = this.enemies.getChildren() as Enemy[]
		for (const enemy of enemies) {
			if (!enemy.active) {
				continue
			}
			const sway = enemy.getData('sway') as number
			enemy.body.velocity.x =
				Math.sin((time / 1000) * ENEMY.swayFrequency + sway) * ENEMY.swaySpeed
			enemy.body.velocity.y = ENEMY.descendSpeed

			if (enemy.y >= GAME.height - ENEMY.bottomMargin) {
				this.enemyEscaped(enemy)
			}
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

	/** An enemy that reached the bottom: it costs the player one life. */
	private enemyEscaped(enemy: Enemy): void {
		if (this.gameOver) {
			return
		}
		this.killEnemy(enemy)
		this.lives -= 1
		this.updateHud()
		this.cameras.main.shake(120, 0.006)
		if (this.lives <= 0) {
			this.endGame()
			return
		}
		this.checkWaveComplete()
	}

	private updateHud(): void {
		// One heart per remaining life keeps the readout compact.
		this.hpText.setText(`HP ${'♥'.repeat(Math.max(this.lives, 0))}`)
		this.hpText.setColor(this.lives <= 1 ? HUD.dangerColor : HUD.color)
		this.scoreText.setText(`Score ${this.score}`)
	}
}
