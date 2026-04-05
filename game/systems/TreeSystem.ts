import { TREE_INTERACT_RADIUS, GRID_SIZE } from "../config/constants"
import { ChunkData } from "./world/WorldGenerator"

export type TreeType = "green" | "orange"

export class TreeSystem {
  private trees: Phaser.GameObjects.Group
  private scene: Phaser.Scene

  private static TREE_CONFIG = {
    green: { top: "tree_green_top", bottom: "tree_green_bottom" },
    orange: { top: "tree_orange_top", bottom: "tree_orange_bottom" }
  }

  private chunkTrees: Map<string, Phaser.GameObjects.Container[]> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.trees = scene.add.group()
  }

  public onChunkLoaded(data: ChunkData) {
    const key = `${data.x},${data.y}`
    if (this.chunkTrees.has(key)) return // Already loaded
    if (!this.trees.active || !this.scene.scene.isActive(this.scene.scene.key)) return

    const treesInChunk: Phaser.GameObjects.Container[] = []
    data.objects.forEach(obj => {
      if (obj.type === "green" || obj.type === "orange") {
        const tree = this.createTree(obj.x * GRID_SIZE, obj.y * GRID_SIZE, obj.type as TreeType)
        if (tree) treesInChunk.push(tree)
      }
    })
    this.chunkTrees.set(key, treesInChunk)
  }

  public onChunkUnloaded(key: string) {
    const treesInChunk = this.chunkTrees.get(key)
    if (treesInChunk) {
      treesInChunk.forEach(tree => {
        this.trees.remove(tree)
        tree.destroy()
      })
      this.chunkTrees.delete(key)
    }
  }

  public createTree(x: number, y: number, type: TreeType = "green"): Phaser.GameObjects.Container | undefined {
    if (!this.trees.active) return undefined
    const config = TreeSystem.TREE_CONFIG[type]
    const random = Math.random() * 33 + 10;
    // Use specific coordinates (already in world space pixels)
    const gx = x + GRID_SIZE / 2
    const gy = y + GRID_SIZE / 2

    // Each chunk is 16*16, GRID_SIZE is 48.
    // Increased scale for larger trees as requested.
    const treeScale = (GRID_SIZE / 32) * 2.5
    // Refactored container: (0,0) is the base of the tree
    const container = this.scene.add.container(gx, gy + 16, [
      this.scene.add.sprite(0, 0, config.bottom).setScale(treeScale).setOrigin(0.5, 1),
      this.scene.add.sprite(0, -(random + 10), config.top).setScale(treeScale).setDepth(2).setOrigin(0.5, 1),
    ])

    container.setDepth(10 + (gx + gy) / 10000)
    container.setData('hp', 10) // TREE_MAX_HP
    this.trees.add(container)
    this.scene.physics.add.existing(container)
      ; (container.body as Phaser.Physics.Arcade.Body).setImmovable(true)
      ; (container.body as Phaser.Physics.Arcade.Body).setSize(GRID_SIZE * 1.5, GRID_SIZE * 1.5)
      ; (container.body as Phaser.Physics.Arcade.Body).setOffset(-GRID_SIZE * 0.75, -GRID_SIZE * 1.25)
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

  chopTree(tree: Phaser.GameObjects.Container, power: number): boolean {
    const currentHp = tree.getData('hp') - power
    tree.setData('hp', currentHp)

    // Visual feedback: shake the tree
    this.scene.tweens.add({
      targets: tree,
      x: tree.x + 2,
      duration: 50,
      yoyo: true,
      repeat: 1
    })

    // Leaning effect at half health (e.g., 5 HP)
    if (currentHp <= 5 && currentHp > 0) {
      this.scene.tweens.add({
        targets: tree,
        angle: 8, // Slight lean
        duration: 200,
        ease: "Power2"
      })
    }

    if (currentHp <= 0) {
      // Falling animation
      this.trees.remove(tree) // Remove from collision group early
      if (tree.body) (tree.body as Phaser.Physics.Arcade.Body).setEnable(false)

      const fallDirection = Math.random() > 0.5 ? 90 : -90

      this.scene.tweens.add({
        targets: tree,
        angle: fallDirection,
        alpha: 0,
        y: tree.y + 10,
        duration: 800,
        ease: "Cubic.easeIn",
        onComplete: () => {
          tree.destroy()
        }
      })
    }

    return currentHp <= 0
  }

  getTreeCount(): number {
    return this.trees.getChildren().length
  }
}
