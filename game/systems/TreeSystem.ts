import * as Phaser from "phaser"
import { TREE_COUNT, WORLD_SIZE, TREE_INTERACT_RADIUS } from "../config/constants"

export class TreeSystem {
  private trees: Phaser.GameObjects.Group
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.trees = scene.add.group()
    this.generateTrees()
  }

  private generateTrees() {
    for (let i = 0; i < TREE_COUNT; i++) {
      this.trees.add(this.createTree(
        Math.random() * WORLD_SIZE,
        Math.random() * WORLD_SIZE
      ))
    }
  }

  private createTree(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y, [
      this.scene.add.sprite(0, 16, "tree_bottom").setScale(3),
      this.scene.add.sprite(0, -16, "tree_top").setScale(3).setDepth(2),
    ])
    container.setDepth(1)
    this.scene.physics.add.existing(container)
    ;(container.body as Phaser.Physics.Arcade.Body).setImmovable(true)
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
    tree.destroy()
  }

  getTreeCount(): number {
    return this.trees.getChildren().length
  }
}