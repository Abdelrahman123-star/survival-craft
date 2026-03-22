import * as Phaser from "phaser"
import { TREE_COUNT, WORLD_SIZE, TREE_INTERACT_RADIUS } from "../config/constants"

export type TreeType = "green" | "orange"

export class TreeSystem {
  private trees: Phaser.GameObjects.Group
  private scene: Phaser.Scene

  private static TREE_CONFIG = {
    green: { top: 4, bottom: 16 },
    orange: { top: 3, bottom: 15 }
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.trees = scene.add.group()
    this.generateTrees()
  }

  private generateTrees() {
    const villageRadius = 350
    const center = WORLD_SIZE / 2

    // Generate random trees in wilderness
    for (let i = 0; i < TREE_COUNT; i++) {
      let x, y, distance
      let attempts = 0
      do {
        x = Math.random() * WORLD_SIZE
        y = Math.random() * WORLD_SIZE
        distance = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2))
        attempts++
      } while (distance < villageRadius && attempts < 100)

      const type: TreeType = Math.random() > 0.5 ? "green" : "orange"
      this.createTree(x, y, type)
    }
  }

  public createTree(x: number, y: number, type: TreeType = "green"): Phaser.GameObjects.Container {
    const config = TreeSystem.TREE_CONFIG[type]

    // Grid alignment for cleaner look
    const gx = Math.floor(x / 32) * 32 + 16
    const gy = Math.floor(y / 32) * 32 + 16

    const container = this.scene.add.container(gx, gy, [
      this.scene.add.sprite(0, 16, "tileset", config.bottom).setScale(4),
      this.scene.add.sprite(0, -16, "tileset", config.top).setScale(4).setDepth(2),
    ])

    container.setDepth(10 + (gx + gy) / 10000) // Above ground, below UI
    this.trees.add(container)
    this.scene.physics.add.existing(container)
      ; (container.body as Phaser.Physics.Arcade.Body).setImmovable(true)
      ; (container.body as Phaser.Physics.Arcade.Body).setSize(32, 32)
    return container
  }

  getNearbyTree(playerX: number, playerY: number, radius: number = TREE_INTERACT_RADIUS): Phaser.GameObjects.Container | undefined {
    return this.trees.getChildren().find((go) => {
      const tree = go as Phaser.GameObjects.Container
      const dx = playerX - tree.x
      const dy = playerY - tree.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance < radius
    }) as Phaser.GameObjects.Container | undefined
  }

  chopTree(tree: Phaser.GameObjects.Container): void {
    this.trees.remove(tree)
    tree.destroy()
  }

  getTreeCount(): number {
    return this.trees.getChildren().length
  }
}