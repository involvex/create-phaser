import * as Phaser from 'phaser'
import {COLORS, GAME, SIZE, SYMBOLS, SYMBOL_COLORS, TIMING} from '../config'

/** One card as a Container: back image + face image + face symbol text. */
interface CardView {
	container: Phaser.GameObjects.Container
	back: Phaser.GameObjects.Image
	face: Phaser.GameObjects.Image
	label: Phaser.GameObjects.Text
	symbol: string
	revealed: boolean
}

/**
 * Memory-match scene.
 *
 * All card art is procedural (two Graphics.generateTexture calls below),
 * cards are laid out on centered Containers, and clicking a card runs a
 * two-phase scale.x flip. Two open cards either stay face-up (match) or flip
 * back down after a short pause (mismatch).
 */
export class GameScene extends Phaser.Scene {
	private cards: CardView[] = []
	/** The one or two cards currently face-up. */
	private openCards: CardView[] = []
	/** Moves = completed two-card attempts. */
	private moves = 0
	/** True while a pair is resolving (or the win screen is up). */
	private busy = false
	private movesText!: Phaser.GameObjects.Text

	constructor() {
		super('Game')
	}

	create(): void {
		// scene.restart() re-runs create() - reset all state here.
		this.cards = []
		this.openCards = []
		this.moves = 0
		this.busy = false

		this.buildTextures()
		this.buildHud()
		this.dealCards()
	}

	// --------------------------------------------------------------------
	// Setup helpers (run once per create())
	// --------------------------------------------------------------------

	/** Bake the two card textures (back + face) with Graphics. */
	private buildTextures(): void {
		// Card back: dark rounded rectangle with a double border.
		const back = this.add.graphics()
		back.fillStyle(COLORS.cardBack, 1)
		back.fillRoundedRect(0, 0, SIZE.cardW, SIZE.cardH, 12)
		back.lineStyle(3, COLORS.cardBackBorder, 1)
		back.strokeRoundedRect(1.5, 1.5, SIZE.cardW - 3, SIZE.cardH - 3, 10)
		back.lineStyle(1, COLORS.cardBackInner, 1)
		back.strokeRoundedRect(9, 9, SIZE.cardW - 18, SIZE.cardH - 18, 6)
		back.generateTexture('card-back', SIZE.cardW, SIZE.cardH)
		back.destroy()

		// Card face: light rounded rectangle the symbol text sits on.
		const face = this.add.graphics()
		face.fillStyle(COLORS.cardFace, 1)
		face.fillRoundedRect(0, 0, SIZE.cardW, SIZE.cardH, 12)
		face.lineStyle(3, COLORS.cardFaceBorder, 1)
		face.strokeRoundedRect(1.5, 1.5, SIZE.cardW - 3, SIZE.cardH - 3, 10)
		face.generateTexture('card-face', SIZE.cardW, SIZE.cardH)
		face.destroy()
	}

	private buildHud(): void {
		this.movesText = this.add
			.text(16, 12, 'Moves: 0', {
				fontFamily: 'Arial, sans-serif',
				fontSize: '24px',
				fontStyle: 'bold',
				color: COLORS.hudText,
			})
			.setDepth(100)

		this.add
			.text(GAME.width / 2, 16, 'Memory Match', {
				fontFamily: 'Arial, sans-serif',
				fontSize: '20px',
				color: COLORS.mutedText,
			})
			.setOrigin(0.5)
			.setDepth(100)
	}

	/** Shuffle a fresh deck and lay it out as a centered 4x3 grid. */
	private dealCards(): void {
		// Two of every symbol, shuffled with Phaser's array helpers.
		const deck = Phaser.Utils.Array.Shuffle([...SYMBOLS, ...SYMBOLS])

		// Center the grid on the canvas, nudged down for the HUD row.
		const gridW = SIZE.cols * SIZE.cardW + (SIZE.cols - 1) * SIZE.gapX
		const gridH = SIZE.rows * SIZE.cardH + (SIZE.rows - 1) * SIZE.gapY
		const left = (GAME.width - gridW) / 2
		const top = (GAME.height - gridH) / 2 + 10
		const stepX = SIZE.cardW + SIZE.gapX
		const stepY = SIZE.cardH + SIZE.gapY

		deck.forEach((symbol, index) => {
			const col = index % SIZE.cols
			const row = Math.floor(index / SIZE.cols)
			this.createCard(
				symbol,
				left + SIZE.cardW / 2 + col * stepX,
				top + SIZE.cardH / 2 + row * stepY,
			)
		})
	}

	private createCard(symbol: string, x: number, y: number): void {
		const back = this.add.image(0, 0, 'card-back')
		const face = this.add.image(0, 0, 'card-face').setVisible(false)
		const label = this.add
			.text(0, 0, symbol, {
				fontFamily: 'Arial, sans-serif',
				fontSize: '54px',
				fontStyle: 'bold',
				color: SYMBOL_COLORS[SYMBOLS.indexOf(symbol)] ?? '#ffffff',
			})
			.setOrigin(0.5)
			.setVisible(false)

		const container = this.add.container(x, y, [back, face, label])
		// Containers have no body, so give them an explicit rectangular hit area.
		container.setInteractive(
			new Phaser.Geom.Rectangle(
				-SIZE.cardW / 2,
				-SIZE.cardH / 2,
				SIZE.cardW,
				SIZE.cardH,
			),
			Phaser.Geom.Rectangle.Contains,
		)

		const card: CardView = {
			container,
			back,
			face,
			label,
			symbol,
			revealed: false,
		}
		container.on('pointerdown', () => this.onCardClicked(card))
		this.cards.push(card)
	}

	// --------------------------------------------------------------------
	// Gameplay
	// --------------------------------------------------------------------

	private onCardClicked(card: CardView): void {
		if (this.busy || card.revealed) {
			return // a pair is resolving, or the card is already face-up
		}

		this.flipCard(card, 'front')
		this.openCards.push(card)
		if (this.openCards.length < 2) {
			return
		}

		// Second card opened: this counts as a move. Resolve the pair.
		this.moves += 1
		this.movesText.setText(`Moves: ${this.moves}`)
		this.busy = true

		const [a, b] = this.openCards
		if (a.symbol === b.symbol) {
			// Match: clear the queue and give both cards a pop; they stay face-up.
			this.openCards = []
			this.tweens.add({
				targets: [a.container, b.container],
				scale: 1.12,
				yoyo: true,
				duration: TIMING.popMs,
				ease: 'Quad.easeOut',
				onComplete: () => {
					this.busy = false
					this.checkWin()
				},
			})
		} else {
			// Mismatch: let the player look, then flip both back down.
			this.time.delayedCall(TIMING.mismatchMs, () => {
				this.flipCard(b, 'back')
				this.flipCard(a, 'back', () => {
					this.openCards = []
					this.busy = false
				})
			})
		}
	}

	/**
	 * Two-phase flip: tween scale.x to 0, swap the visible side in the middle,
	 * then tween back to 1 - a classic card flip built only from scale tweens.
	 */
	private flipCard(
		card: CardView,
		target: 'front' | 'back',
		onDone?: () => void,
	): void {
		const faceUp = target === 'front'
		card.revealed = faceUp
		this.tweens.add({
			targets: card.container,
			scaleX: 0,
			duration: TIMING.flipMs / 2,
			ease: 'Sine.easeIn',
			onComplete: () => {
				card.back.setVisible(!faceUp)
				card.face.setVisible(faceUp)
				card.label.setVisible(faceUp)
				this.tweens.add({
					targets: card.container,
					scaleX: 1,
					duration: TIMING.flipMs / 2,
					ease: 'Sine.easeOut',
					onComplete: () => onDone?.(),
				})
			},
		})
	}

	private checkWin(): void {
		if (!this.cards.every(card => card.revealed)) {
			return
		}

		// Win screen: dim the board, show the stats, wait for a click.
		this.busy = true

		this.add
			.rectangle(
				GAME.width / 2,
				GAME.height / 2,
				GAME.width,
				GAME.height,
				COLORS.winVeil,
				0.78,
			)
			.setDepth(900)

		this.add
			.text(
				GAME.width / 2,
				GAME.height / 2 - 24,
				`You won in ${this.moves} moves`,
				{
					fontFamily: 'Arial, sans-serif',
					fontSize: '40px',
					fontStyle: 'bold',
					color: COLORS.winText,
				},
			)
			.setOrigin(0.5)
			.setDepth(901)

		this.add
			.text(GAME.width / 2, GAME.height / 2 + 28, 'Click to play again', {
				fontFamily: 'Arial, sans-serif',
				fontSize: '20px',
				color: COLORS.hudText,
			})
			.setOrigin(0.5)
			.setDepth(901)

		this.input.once('pointerdown', () => this.scene.restart())
	}
}
