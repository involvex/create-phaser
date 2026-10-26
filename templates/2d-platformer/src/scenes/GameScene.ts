import * as Phaser from "phaser";
import { COLORS, GAME, LEVEL, PLAYER } from "../config";

/**
 * Gameplay scene: run, jump, collect coins and don't fall off.
 *
 * Every visual is procedural (textures come from BootScene) and every
 * tunable lives in src/config.ts, so gameplay tweaks never touch scene code.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemy!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.StaticGroup;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;

  private scoreText!: Phaser.GameObjects.Text;

  /** Reset in create() so scene.restart() always starts a clean run. */
  private score = 0;
  /** Guards the "fell into a pit" restart so it cannot fire twice. */
  private restarting = false;

  constructor() {
    super("Game");
  }

  create(): void {
    this.score = 0;
    this.restarting = false;

    this.buildWorld();
    this.buildPlayer();
    this.buildEnemy();
    this.buildHud();
    this.setupInput();
    this.setupCamera();
  }

  update(_time: number, _delta: number): void {
    // R restarts the level at any time.
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
      return;
    }

    this.handleMovement();
    this.patrolEnemy();
    this.checkFall();
  }

  // --------------------------------------------------------------------
  // Build helpers (run once per create())
  // --------------------------------------------------------------------

  private buildWorld(): void {
    // Static physics groups: immovable geometry - perfect for terrain.
    this.ground = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.staticGroup();

    // Ground strips along the bottom; the gaps between them are pits.
    for (const seg of LEVEL.ground) {
      const strip = this.ground.create(
        seg.x + seg.w / 2,
        GAME.height - LEVEL.groundH / 2,
        "ground",
      ) as Phaser.Physics.Arcade.Image;
      // Static bodies do not follow setDisplaySize() - refreshBody() syncs them.
      strip.setDisplaySize(seg.w, LEVEL.groundH).refreshBody();
    }

    // Floating platforms: one rounded texture stretched to each width.
    for (const plat of LEVEL.platforms) {
      const bar = this.platforms.create(
        plat.x + plat.w / 2,
        plat.y + LEVEL.platformH / 2,
        "platform",
      ) as Phaser.Physics.Arcade.Image;
      bar.setDisplaySize(plat.w, LEVEL.platformH).refreshBody();
    }

    // Coins bob gently; a tween only moves the sprite, not its physics body.
    for (const spot of LEVEL.coins) {
      const coin = this.coins.create(
        spot.x,
        spot.y,
        "coin",
      ) as Phaser.Physics.Arcade.Image;
      coin.setDepth(5);
      this.tweens.add({
        targets: coin,
        y: spot.y - 6,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private buildPlayer(): void {
    this.player = this.physics.add.sprite(
      LEVEL.start.x,
      LEVEL.start.y,
      "player",
    );

    // Collide with the static world (ground + platforms).
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);

    // Never collide with the physics world bounds: the level bottom is
    // checked manually in checkFall() so pit falls can restart the run.
    this.player.setCollideWorldBounds(false);

    // Coin pickups: overlap (no physical push), destroyed on touch.
    this.physics.add.overlap(this.player, this.coins, (_player, coin) => {
      const target = coin as Phaser.Physics.Arcade.Image;
      if (!target.active) {
        return; // already collected in this physics step
      }
      const x = target.x;
      const y = target.y;
      target.destroy();
      this.score += 1;
      this.scoreText.setText(`Score: ${this.score}`);
      this.spawnPop(x, y);
    });
  }

  private buildEnemy(): void {
    this.enemy = this.physics.add.sprite(LEVEL.enemy.x, LEVEL.enemy.y, "enemy");
    this.enemy.setVelocityX(LEVEL.enemy.speed);
    this.enemy.setDepth(5);
    // The enemy walks on the same ground; patrol bounds keep it on its strip.
    this.physics.add.collider(this.enemy, this.ground);

    // Player/enemy contact is intentionally unhandled - add an overlap here
    // if you want the enemy to hurt the player instead of just wandering.
  }

  private buildHud(): void {
    // scrollFactor(0) keeps the HUD pinned to the screen while the camera
    // scrolls through the level.
    this.scoreText = this.add
      .text(16, 12, "Score: 0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
        color: COLORS.hudText,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(16, 42, "W / ↑ / Space = jump   R = restart", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: COLORS.hudHint,
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }

  private setupCamera(): void {
    // The world is wider than the viewport: bound the camera to it, then
    // ease toward the player (lerp) instead of snapping frame-by-frame.
    const camera = this.cameras.main;
    camera.setBounds(0, 0, GAME.worldWidth, GAME.height);
    camera.startFollow(this.player, true, 0.08, 0.08);
  }

  // --------------------------------------------------------------------
  // Per-frame helpers
  // --------------------------------------------------------------------

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    if (left === right) {
      // No input, or both directions held at once: stand still.
      this.player.setVelocityX(0);
    } else if (left) {
      this.player.setVelocityX(-PLAYER.speed);
      this.player.setFlipX(true);
    } else {
      this.player.setVelocityX(PLAYER.speed);
      this.player.setFlipX(false);
    }

    // Jump only while standing: body.blocked.down is true on the ground,
    // which naturally prevents double jumps.
    const wantsJump =
      this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
    if (wantsJump && body.blocked.down) {
      this.player.setVelocityY(PLAYER.jumpVelocity);
    }
  }

  /** Ping-pong the enemy between its patrol bounds. */
  private patrolEnemy(): void {
    if (this.enemy.x <= LEVEL.enemy.minX) {
      this.enemy.setVelocityX(LEVEL.enemy.speed);
    } else if (this.enemy.x >= LEVEL.enemy.maxX) {
      this.enemy.setVelocityX(-LEVEL.enemy.speed);
    }
  }

  private checkFall(): void {
    if (this.restarting || this.player.y <= GAME.height + 120) {
      return;
    }
    // Fell into a pit: shake the camera, then restart after a short beat.
    this.restarting = true;
    this.player.setVisible(false);
    this.cameras.main.shake(350, 0.02);
    this.time.delayedCall(600, () => this.scene.restart());
  }

  /** "+1" score popup that floats up and fades out over the collect spot. */
  private spawnPop(x: number, y: number): void {
    const pop = this.add
      .text(x, y, "+1", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: COLORS.popText,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: pop,
      y: y - 40,
      alpha: 0,
      duration: 550,
      ease: "Quad.easeOut",
      onComplete: () => pop.destroy(),
    });
  }
}
