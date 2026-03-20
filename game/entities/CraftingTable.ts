import * as Phaser from "phaser"

export class CraftingTable {
  public sprite: Phaser.Physics.Arcade.Sprite

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "crafting-table")
      .setScale(3)
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

