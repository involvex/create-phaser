import * as Phaser from "phaser";
import { COLORS, GAME } from "../config";

/**
 * GameScene is where your game lives.
 *
 * Out of the box it draws a headline, animates one square and wires a
 * Space-key toggle. Everything below the `YOUR GAME GOES HERE` marker is
 * starter code - replace it freely with your own game.
 */
export class GameScene extends Phaser.Scene {
  /** Space key, registered with addKey() in create(). */
  private spaceKey!: Phaser.Input.Keyboard.Key;
  /** The secondary text block toggled with Space. */
  private secretText!: Phaser.GameObjects.Text;

  constructor() {
    super("Game");
  }

  create(): void {
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    const centerX = GAME.width / 2;

    // -- Headline + subtitle ------------------------------------------------
    this.add
      .text(centerX, 170, "Phaser 4 Starter", {
        fontFamily: "Arial, sans-serif",
        fontSize: "54px",
        fontStyle: "bold",
        color: COLORS.headline,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, 216, "Blank template // ready to hack", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    // -- A square that spins while it bobs up and down ----------------------
    const squareY = 330;
    const square = this.add.image(centerX, squareY, "square");
    this.tweens.add({
      targets: square,
      angle: 360,
      duration: 2400,
      repeat: -1,
    });
    this.tweens.add({
      targets: square,
      y: squareY - 46,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // -- Space-key hint + the text it toggles -------------------------------
    this.add
      .text(centerX, 430, "Press SPACE to toggle the details", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    this.secretText = this.add
      .text(
        centerX,
        482,
        "Scenes are small classes: create() builds things once,\n" +
          "update() runs every frame. Tweak config.ts to recolor and resize.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: COLORS.text,
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setVisible(false);

    // ==================================================================
    //  YOUR GAME GOES HERE
    //
    //  Ideas to start with:
    //  - replace `square` with your own art (see BootScene textures)
    //  - add input in update() like the Space toggle below
    //  - add a physics engine any time:
    //      physics: { default: "arcade", ... } in src/main.ts, then
    //      this.physics.add.sprite(...) instead of this.add.image(...)
    //  - keep tunables in src/config.ts
    // ==================================================================
  }

  update(_time: number, _delta: number): void {
    // Phaser calls update() every frame. JustDown() is true only on a fresh
    // key press, which makes it perfect for one-shot toggles like this.
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.secretText.setVisible(!this.secretText.visible);
    }
  }
}
