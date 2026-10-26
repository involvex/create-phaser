import * as Phaser from "phaser";
import { GAME } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

/**
 * Phaser entry point.
 *
 * The game boots through the scene list below (first scene first), so
 * BootScene runs, generates textures and hands over to GameScene.
 * No physics engine is wired up here - add one when your game needs it.
 */
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME.width,
  height: GAME.height,
  backgroundColor: GAME.backgroundColor,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene],
});
