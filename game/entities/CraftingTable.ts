import * as Phaser from "phaser"

export class CraftingTable {
  public sprite: Phaser.Physics.Arcade.Sprite

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Reuse merchant texture for now (no crafting asset yet)
    this.sprite = scene.physics.add.sprite(x, y, "merchant")
      .setScale(2.4)
      .setTint(0x66ffcc)
      .setDepth(1)
      .setImmovable(true)

    scene.add.text(x, y - 48, "[E] Craft", {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "Arial",
      backgroundColor: "#000000bb",
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(2)
  }
}

