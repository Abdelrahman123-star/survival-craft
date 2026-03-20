import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"
import { CraftingSystem, Recipe, GridSlot } from "../systems/CraftingSystem"

export class CraftingUI {
  private scene: Phaser.Scene
  private container!: Phaser.GameObjects.Container
  private isOpen = false
  private grid: (GridSlot | null)[][] = [[null, null, null], [null, null, null], [null, null, null]]
  private gridSlots: Phaser.GameObjects.Container[] = []
  private outputSlot!: Phaser.GameObjects.Container
  private currentRecipe: Recipe | null = null
  private player!: Player
  private craftingSystem!: CraftingSystem
  private inventoryUI: any

  constructor(scene: Phaser.Scene) { this.scene = scene; this.create() }

  private create() {
    this.container = this.scene.add.container(0, 0).setDepth(220).setVisible(false)
    const panel = this.scene.add.rectangle(0, 0, 400, 300, 0x242424, 0.95).setStrokeStyle(2, 0xffffff, 0.3).setInteractive().on('pointerdown', (p: any, lx: any, ly: any, e: any) => e.stopPropagation())
    const title = this.scene.add.text(-180, -135, "Crafting Table", { fontSize: "20px", color: "#fff", fontStyle: "bold" })
    const closeBtn = this.scene.add.text(175, -135, "✕", { fontSize: "22px", color: "#fff" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.hide())
    this.container.add([panel, title, closeBtn])

    const slotSize = 60, spacing = 5, startY = -40, startX = -120
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const slot = this.createSlot(startX + c * (slotSize + spacing), startY + r * (slotSize + spacing), slotSize)
        const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle
        bg.on("pointerdown", (p: Phaser.Input.Pointer, lx: any, ly: any, e: any) => { e.stopPropagation(); this.handleGridSlotClick(r, c, p) })
        this.gridSlots.push(slot); this.container.add(slot)
      }
    }
    this.container.add(this.scene.add.text(60, startY + slotSize + spacing, "➜", { fontSize: "32px", color: "#fff" }).setOrigin(0.5))
    this.outputSlot = this.createSlot(140, startY + slotSize + spacing, 70, true)
    const outBg = this.outputSlot.getAt(0) as Phaser.GameObjects.Rectangle
    outBg.on("pointerdown", (p: Phaser.Input.Pointer, lx: any, ly: any, e: any) => { e.stopPropagation(); this.handleOutputClick(p) })
    this.container.add(this.outputSlot)
  }




  private createSlot(x: number, y: number, size: number, isOut: boolean = false): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y)
    const bg = this.scene.add.rectangle(0, 0, size, size, 0x333333, 0.8).setStrokeStyle(1.5, isOut ? 0xFFD700 : 0x666666).setInteractive({ useHandCursor: true })
    const icon = this.scene.add.image(0, 0, "").setScale(2.5).setVisible(false).setTint(0xffffff)
    const qty = this.scene.add.text(size / 2 - 5, size / 2 - 5, "", { fontSize: "14px", color: "#fff", fontStyle: "bold" }).setOrigin(1).setVisible(false)
    c.add([bg, icon, qty]); return c
  }

  show(p: Player, c: CraftingSystem, i: any) { this.player = p; this.craftingSystem = c; this.inventoryUI = i; this.isOpen = true; this.container.setVisible(true); this.updatePosition(); this.updateGridUI() }
  hide() { this.returnAllToInventory(); this.isOpen = false; this.container.setVisible(false); if (this.inventoryUI?.isOpenNow()) this.inventoryUI.toggle(false) }
  isOpenNow(): boolean { return this.isOpen }

  handleDrop(r: number, c: number, itemId: string, count: number): number {
    const ex = this.grid[r][c]
    if (!ex) { this.grid[r][c] = { itemId, count }; this.updateGridUI(); return count }
    else if (ex.itemId === itemId) { ex.count += count; this.updateGridUI(); return count }
    return 0
  }

  handleRightClickDrop(r: number, c: number, itemId: string): boolean {
    const ex = this.grid[r][c]
    if (!ex) { this.grid[r][c] = { itemId, count: 1 }; this.updateGridUI(); return true }
    else if (ex.itemId === itemId) { ex.count += 1; this.updateGridUI(); return true }
    return false
  }

  removeFromSlot(r: number, c: number, count: number) {
    const s = this.grid[r][c]; if (!s) return
    s.count -= count; if (s.count <= 0) this.grid[r][c] = null
    this.updateGridUI()
  }

  getSlotAtPosition(x: number, y: number): { r: number, c: number } | null {
    if (!this.isOpen) return null
    for (let i = 0; i < this.gridSlots.length; i++) {
      const bg = this.gridSlots[i].getAt(0) as Phaser.GameObjects.Rectangle
      const b = bg.getBounds()
      if (x >= b.x && x <= b.right && y >= b.y && y <= b.bottom) return { r: Math.floor(i / 3), c: i % 3 }
    }
    return null
  }

  private handleGridSlotClick(r: number, c: number, p: Phaser.Input.Pointer) {
    const s = this.grid[r][c]; if (!s) return
    if (this.inventoryUI) {
      this.inventoryUI.startDrag(`${r}_${c}`, { item: ITEMS[s.itemId], quantity: s.count })
      this.grid[r][c] = null; this.updateGridUI()
    }
  }

  private handleOutputClick(p: Phaser.Input.Pointer) {
    if (!this.currentRecipe) return
    const res = this.craftingSystem.craft(this.player, this.grid, p.rightButtonDown())
    if (typeof res !== "string") {
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) this.removeFromSlot(r, c, res.consumedCount)
      this.inventoryUI.refreshUI()
    }
  }

  private returnAllToInventory() {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const s = this.grid[r][c]; if (s) { this.player.inventory.addItem(ITEMS[s.itemId], s.count); this.grid[r][c] = null }
    }
    if (this.inventoryUI) this.inventoryUI.refreshUI()
  }

  updatePosition() {
    const cam = this.scene.cameras.main
    this.container.setPosition(cam.scrollX + this.scene.scale.width * 0.28, cam.scrollY + this.scene.scale.height / 2)
  }

  update() { if (this.isOpen) this.updatePosition() }

  private updateGridUI() {
    for (let i = 0; i < 9; i++) {
      const s = this.grid[Math.floor(i / 3)][i % 3], c = this.gridSlots[i]
      const ic = c.getAt(1) as any, q = c.getAt(2) as any
      if (s) { ic.setTexture(ITEMS[s.itemId].icon).setVisible(true); q.setText(s.count > 1 ? s.count.toString() : "").setVisible(s.count > 1) }
      else { ic.setVisible(false); q.setVisible(false) }
    }
    this.currentRecipe = this.craftingSystem.checkRecipe(this.grid)
    const oic = this.outputSlot.getAt(1) as any, oq = this.outputSlot.getAt(2) as any
    if (this.currentRecipe) {
      oic.setTexture(ITEMS[this.currentRecipe.outputItemId].icon).setVisible(true)
      oq.setText(this.currentRecipe.outputQty > 1 ? this.currentRecipe.outputQty.toString() : "").setVisible(this.currentRecipe.outputQty > 1)
    } else { oic.setVisible(false); oq.setVisible(false) }
  }
}
