import * as Phaser from 'phaser'
import {BALL, BRICK, GAME, HUD, PADDLE, PLAYER} from '../config'

/** Ball lifecycle: parked on the paddle → flying → dead between lives. */
type BallState = 'waiting' | 'flying' | 'dead'

/**
 * Ball with a guaranteed dynamic Arcade body (this scene owns it, so the
 * body is never null and is re-enabled on every launch).
 */
type Ball = Phaser.Physics.Arcade.Image & {
	body: Phaser.Physics.Arcade.Body
}

/** Shape of the key map returned by Phaser.Input.Keyboard#addKeys("A,D"). */
type SteerKeys = Record<'A' | 'D', Phaser.Input.Keyboard.Key>

/**
 * The single gameplay scene: a paddle, a bouncing ball and a wall of bricks.
 *
 * All visuals are procedural — paddle, ball and bricks are drawn once into
 * small white textures with Phaser.GameObjects.Graphics and then colored at
 * runtime with setTint(), so one texture covers the whole palette.
 */
export class GameScene extends Phaser.Scene {
	// --- Input -------------------------------------------------------------
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
	private steerKeys!: SteerKeys
	private launchKey!: Phaser.Input.Keyboard.Key
	private restartKey!: Phaser.Input.Keyboard.Key

	// --- Game objects ------------------------------------------------------
	private paddle!: Phaser.Physics.Arcade.Image
	private ball!: Ball
	private bricks!: Phaser.Physics.Arcade.StaticGroup

	// --- HUD ---------------------------------------------------------------
	private scoreText!: Phaser.GameObjects.Text
	private livesText!: Phaser.GameObjects.Text
	private hintText!: Phaser.GameObjects.Text

	// --- Run state ---------------------------------------------------------
	private ballState: BallState = 'dead'
	private lives = 0
	private score = 0
	private bricksLeft = 0
	private ended = false
	/**
	 * Latest "pointermove" position, or null while keyboard steering is in
	 * charge. Cleared by key steering so the paddle never snaps back.
	 */
	private pointerTargetX: number | null = null

	constructor() {
		super('Game')
	}

	create(): void {
		// Reset run state here: the scene *instance* survives a restart, so
		// field initializers would keep stale values from the previous run.
		this.score = 0
		this.lives = PLAYER.startLives
		this.bricksLeft = 0
		this.ballState = 'dead'
		this.pointerTargetX = null
		this.ended = false

		this.buildTextures()
		this.buildInput()
		this.buildWorld()
		this.buildHud()
		this.setupCollisions()
		this.serveBall()
	}

	update(_time: number, delta: number): void {
		if (this.ended) {
			if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
				this.scene.restart()
			}
			return
		}

		this.movePaddle(delta)

		if (this.ballState === 'waiting') {
			// The parked ball rides the paddle until the player launches it.
			this.ball.setPosition(
				this.paddle.x,
				this.paddle.y - PADDLE.height / 2 - BALL.size / 2,
			)
			if (Phaser.Input.Keyboard.JustDown(this.launchKey)) {
				this.launchBall()
			}
		}

		// The bottom world bound is open, so a lost ball falls off-screen here.
		if (this.ballState === 'flying' && this.ball.y > GAME.height + BALL.size) {
			this.loseBall()
		}
	}

	// ------------------------------------------------------------------ setup

	/**
	 * Draw the shared white textures once with Phaser.GameObjects.Graphics;
	 * per-object colors come from setTint(). Textures live in the global
	 * texture manager, so they survive scene restarts.
	 */
	private buildTextures(): void {
		if (this.textures.exists(PADDLE.textureKey)) {
			return
		}

		const paddle = this.add.graphics()
		paddle.fillStyle(0xffffff, 1)
		paddle.fillRoundedRect(0, 0, PADDLE.width, PADDLE.height, 6)
		paddle.generateTexture(PADDLE.textureKey, PADDLE.width, PADDLE.height)
		paddle.destroy()

		const ball = this.add.graphics()
		ball.fillStyle(0xffffff, 1)
		ball.fillCircle(BALL.size / 2, BALL.size / 2, BALL.size / 2)
		ball.generateTexture(BALL.textureKey, BALL.size, BALL.size)
		ball.destroy()

		const brick = this.add.graphics()
		brick.fillStyle(0xffffff, 1)
		brick.fillRoundedRect(0, 0, BRICK.width, BRICK.height, 4)
		brick.generateTexture(BRICK.textureKey, BRICK.width, BRICK.height)
		brick.destroy()
	}

	private buildInput(): void {
		const keyboard = this.input.keyboard
		if (!keyboard) {
			throw new Error('This game requires keyboard input')
		}
		this.cursors = keyboard.createCursorKeys()
		this.steerKeys = keyboard.addKeys('A,D') as SteerKeys
		this.launchKey = keyboard.addKey('SPACE')
		this.restartKey = keyboard.addKey('R')

		// Steering: every pointer move retargets the paddle; movePaddle() gives
		// held keys precedence and clears the target while they are pressed.
		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			this.pointerTargetX = pointer.x
		})

		// A click serves the ball mid-round and restarts after the end screens.
		this.input.on('pointerdown', () => {
			if (this.ended) {
				this.scene.restart()
				return
			}
			this.launchBall()
		})
	}

	private buildWorld(): void {
		const centerX = GAME.width / 2
		const paddleY = GAME.height - PADDLE.bottomMargin

		this.paddle = this.physics.add.image(centerX, paddleY, PADDLE.textureKey)
		this.paddle.setTint(PADDLE.color)
		// Immovable paddle: the ball bounces off it instead of pushing it.
		this.paddle.setImmovable(true)

		this.ball = this.physics.add.image(
			centerX,
			paddleY - 60,
			BALL.textureKey,
		) as Ball
		this.ball.setTint(BALL.color)
		this.ball.setBounce(1, 1)
		this.ball.setCollideWorldBounds(true)
		// The bottom edge is deliberately open: a ball that passes it costs a
		// life. Top/left/right still bounce the ball back into the play area.
		this.ball.body.checkCollision.down = false
		this.ball.body.enable = false // parked until the first launch

		// Brick wall: centred horizontally, rows run left-to-right from the top.
		this.bricks = this.physics.add.staticGroup()
		const totalWidth =
			BRICK.columns * BRICK.width + (BRICK.columns - 1) * BRICK.gapX
		const firstCenterX = (GAME.width - totalWidth) / 2 + BRICK.width / 2
		for (let row = 0; row < BRICK.rows; row += 1) {
			for (let column = 0; column < BRICK.columns; column += 1) {
				const brick = this.bricks.create(
					firstCenterX + column * (BRICK.width + BRICK.gapX),
					BRICK.topOffset + row * (BRICK.height + BRICK.gapY),
					BRICK.textureKey,
				) as Phaser.Physics.Arcade.Sprite
				brick.setTint(BRICK.colors[row % BRICK.colors.length])
				brick.setData(
					'points',
					BRICK.points[Math.min(row, BRICK.points.length - 1)],
				)
			}
		}
		this.bricksLeft = BRICK.rows * BRICK.columns
	}

	private buildHud(): void {
		const hudStyle = {
			fontFamily: 'monospace',
			fontSize: HUD.fontSize,
			color: HUD.color,
		}
		this.scoreText = this.add
			.text(16, 14, '', hudStyle)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.livesText = this.add
			.text(GAME.width - 16, 14, '', hudStyle)
			.setOrigin(1, 0)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.hintText = this.add
			.text(GAME.width / 2, GAME.height - 100, '', {
				fontFamily: 'monospace',
				fontSize: '18px',
				color: HUD.color,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.depth)
		this.updateHud()
	}

	private setupCollisions(): void {
		// Paddle: reflect the ball and re-aim it by contact offset. One ball,
		// one paddle — the callback can just read the fields directly.
		this.physics.add.collider(
			this.ball,
			this.paddle,
			() => this.bounceOffPaddle(),
			undefined,
			this,
		)
		// Bricks: shatter on contact; a brick never survives a second hit.
		this.physics.add.collider(
			this.ball,
			this.bricks,
			(_object1, object2) => {
				const brick = object2 as Phaser.Physics.Arcade.Sprite
				this.breakBrick(brick)
			},
			undefined,
			this,
		)
	}

	// ------------------------------------------------------------- game flow

	/** Park the ball on top of the paddle and wait for a launch. */
	private serveBall(): void {
		this.ballState = 'waiting'
		this.ball.setVisible(true)
		this.hintText.setText('Click or press SPACE to launch')
	}

	/** One slight-randomized launch; consecutive rounds behave differently. */
	private launchBall(): void {
		if (this.ended || this.ballState !== 'waiting') {
			return
		}
		const spread = Phaser.Math.DegToRad(
			Phaser.Math.FloatBetween(-BALL.launchSpreadDeg, BALL.launchSpreadDeg),
		)
		const x = this.paddle.x
		const y = this.paddle.y - PADDLE.height / 2 - BALL.size / 2
		this.ball.setPosition(x, y)
		this.ball.body.enable = true
		this.ball.body.reset(x, y)
		this.ball.setVelocity(
			BALL.speed * Math.cos(-Math.PI / 2 + spread),
			BALL.speed * Math.sin(-Math.PI / 2 + spread),
		)
		this.ballState = 'flying'
		this.hintText.setText('')
	}

	/**
	 * Re-aim the ball by where it hit the paddle: dead-centre goes straight
	 * up, edge hits deflect up to maxBounceAngleDeg. Speed stays constant.
	 */
	private bounceOffPaddle(): void {
		if (this.ballState !== 'flying') {
			return // parked ball — ignore phantom overlaps
		}
		const offset = Phaser.Math.Clamp(
			(this.ball.x - this.paddle.x) / (this.paddle.width / 2),
			-1,
			1,
		)
		const angle =
			-Math.PI / 2 + offset * Phaser.Math.DegToRad(PADDLE.maxBounceAngleDeg)
		this.ball.setVelocity(
			BALL.speed * Math.cos(angle),
			BALL.speed * Math.sin(angle),
		)
	}

	private breakBrick(brick: Phaser.Physics.Arcade.Sprite): void {
		if (this.ballState !== 'flying' || !brick.active) {
			return
		}
		brick.destroy()
		this.bricksLeft -= 1
		this.score += brick.getData('points') as number
		this.updateHud()

		if (this.bricksLeft <= 0) {
			this.endRound('You Win!')
		}
	}

	private loseBall(): void {
		this.killBall()
		this.lives -= 1
		this.updateHud()

		if (this.lives <= 0) {
			this.endRound('Game Over')
			return
		}
		// Respawn onto the paddle after a short beat.
		this.time.delayedCall(BALL.respawnDelayMs, () => {
			if (!this.ended) {
				this.serveBall()
			}
		})
	}

	private killBall(): void {
		this.ballState = 'dead'
		this.ball.setVelocity(0, 0)
		this.ball.setVisible(false)
		this.ball.body.enable = false
	}

	/** Show the win / game-over overlay; R or a click restarts the scene. */
	private endRound(title: string): void {
		if (this.ended) {
			return
		}
		this.ended = true
		this.killBall()
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
			.text(GAME.width / 2, GAME.height / 2 - 34, title, {
				fontFamily: 'monospace',
				fontSize: HUD.titleFontSize,
				color: title === 'Game Over' ? HUD.dangerColor : HUD.winColor,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(HUD.overlayDepth + 1)
		this.add
			.text(GAME.width / 2, GAME.height / 2 + 10, `${this.score} points`, {
				fontFamily: 'monospace',
				fontSize: HUD.fontSize,
				color: HUD.color,
			})
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

	/** Pointer target wins by default; held keys temporarily take over. */
	private movePaddle(deltaMs: number): void {
		const left = this.cursors.left.isDown || this.steerKeys.A.isDown
		const right = this.cursors.right.isDown || this.steerKeys.D.isDown
		const steer = (right ? 1 : 0) - (left ? 1 : 0)
		if (steer !== 0) {
			// Forget the pointer target so the paddle does not snap back once
			// the keys are released; it holds position until the mouse moves.
			this.pointerTargetX = null
			this.paddle.x += steer * PADDLE.keyboardSpeed * (deltaMs / 1000)
		} else if (this.pointerTargetX !== null) {
			this.paddle.x = this.pointerTargetX
		}
		const half = PADDLE.width / 2
		this.paddle.x = Phaser.Math.Clamp(this.paddle.x, half, GAME.width - half)
	}

	private updateHud(): void {
		// One heart per remaining life keeps the readout compact.
		this.scoreText.setText(`Score ${this.score}`)
		this.livesText.setText(`Lives ${'♥'.repeat(Math.max(this.lives, 0))}`)
		this.livesText.setColor(this.lives <= 1 ? HUD.dangerColor : HUD.color)
	}
}
