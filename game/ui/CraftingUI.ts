import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"
import { CraftingSystem, RecipeId } from "../systems/CraftingSystem"

export class CraftingUI {
  private scene: Phaser.Scene
  private container!: Phaser.GameObjects.Container
  private isOpen = false
  private statusText!: Phaser.GameObjects.Text
  private woodText!: Phaser.GameObjects.Text
  private rows: Phaser.GameObjects.Container[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.create()
  }

  private create() {
    this.container = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height / 2)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false)

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive()
      .on("pointerdown", () => this.hide())

    const W = 520
    const H = 360
    const panel = this.scene.add.rectangle(0, 0, W, H, 0x1a1a1a, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.2)

    const title = this.scene.add.text(-W / 2 + 18, -H / 2 + 14, "Crafting", {
      fontSize: "24px",
      color: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "bold",
    })

    this.woodText = this.scene.add.text(W / 2 - 18, -H / 2 + 18, "🪵 0", {
      fontSize: "18px",
      color: "#bff0bf",
      fontFamily: "Arial",
      fontStyle: "bold",
    }).setOrigin(1, 0)

    this.statusText = this.scene.add.text(-W / 2 + 18, H / 2 - 54, "", {
      fontSize: "14px",
      color: "#FFD700",
      fontFamily: "Arial",
    })

    const closeBtn = this.scene.add.text(W / 2 - 18, -H / 2 + 12, "✕", {
      fontSize: "22px",
      color: "#ffffff",
      fontFamily: "Arial",
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.hide())

    this.container.add([overlay, panel, title, this.woodText, closeBtn, this.statusText])
  }

  show(player: Player, crafting: CraftingSystem, inventoryUI: any) {
    this.isOpen = true
    this.container.setVisible(true)
    this.statusText.setText("")
    this.rebuildRows(player, crafting, inventoryUI)
    this.refreshCounts(player)
  }

  hide() {
    this.isOpen = false
    this.container.setVisible(false)
  }

  isOpenNow(): boolean {
    return this.isOpen
  }

  private refreshCounts(player: Player) {
    const wood = player.inventory.countItem("wood")
    this.woodText.setText(`🪵 ${wood}`)
  }

  private rebuildRows(player: Player, crafting: CraftingSystem, inventoryUI: any) {
    // clear old
    this.rows.forEach(r => r.destroy())
    this.rows = []

    const W = 520
    const startY = -120
    const rowH = 54
    const recipes = crafting.getRecipes()

    recipes.forEach((r, idx) => {
      const y = startY + idx * rowH
      const row = this.scene.add.container(0, y)

      const bg = this.scene.add.rectangle(0, 0, W - 40, 44, 0x111111, 0.85)
        .setStrokeStyle(1, 0xffffff, 0.08)

      const item = ITEMS[r.outputItemId]
      const icon = this.scene.add.image(-W / 2 + 52, 0, item.icon).setScale(2.1)
      const name = this.scene.add.text(-W / 2 + 80, -10, item.name, {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
      })
      const cost = this.scene.add.text(-W / 2 + 80, 10, `Cost: ${r.woodCost} wood`, {
        fontSize: "12px",
        color: "#cccccc",
        fontFamily: "Arial",
      })

      const canCraft = player.inventory.hasItem("wood", r.woodCost)
      const craftBtn = this.scene.add.text(W / 2 - 70, 0, "Craft", {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "Arial",
        backgroundColor: canCraft ? "#2f7d3a" : "#444444",
        padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })

      craftBtn.on("pointerdown", () => {
        const msg = crafting.craft(player, r.id as RecipeId)
        this.statusText.setText(msg)
        this.refreshCounts(player)
        inventoryUI.refreshUI()
        // rebuild to update button disabled state
        this.rebuildRows(player, crafting, inventoryUI)
      })

      row.add([bg, icon, name, cost, craftBtn])
      this.container.add(row)
      this.rows.push(row)
    })
  }
}

