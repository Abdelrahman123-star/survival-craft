import * as Phaser from "phaser"

export class Merchant {
  public sprite: Phaser.Physics.Arcade.Sprite

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "merchant")
      .setScale(3)
      .setDepth(1)
      .setImmovable(true)

    // Floating [E] Trade label
    scene.add.text(x, y - 48, "@treyg1970\n   [E] Trade", {
      fontSize: "13px",
      color: "#FFD700",
      fontFamily: "Arial",
      backgroundColor: "#000000bb",
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(2)
  }
}