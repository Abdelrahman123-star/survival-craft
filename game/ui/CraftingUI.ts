import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"
import { CraftingSystem, Recipe, GridSlot } from "../systems/CraftingSystem"
import { IUI } from "./IUI"
import { UIManager } from "./UIManager"
import { TilemapUIBackground } from "./TilemapUIBackground"

// ─── Layout ───────────────────────────────────────────────────────────────────
const UI_SCALE = 3.5
const TILE_SIZE = 16
const SLOT_SIZE = 50
const SLOT_STEP = TILE_SIZE * UI_SCALE   // 56 px

const INV_START_X = -224
const INV_START_Y = -84
const CRAFT_START_X = 112
const CRAFT_START_Y = -84
const OUTPUT_X = 168
const OUTPUT_Y = 140

// ─── Held-item state ──────────────────────────────────────────────────────────
interface HeldStack {
  itemId: string
  count: number
}

export class CraftingUI implements IUI {
  private scene: Phaser.Scene
  private container!: Phaser.GameObjects.Container
  private isOpen = false

  // 3×3 crafting grid (internal state, separate from player inventory)
  private craftGrid: (GridSlot | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]

  private craftSlots: Phaser.GameObjects.Container[] = []
  private inventorySlots: Phaser.GameObjects.Container[] = []
  private outputSlot!: Phaser.GameObjects.Container
  private currentRecipe: Recipe | null = null

  // Floating drag sprite — lives in SCREEN space (setScrollFactor 0)
  private held: HeldStack | null = null
  private dragIcon!: Phaser.GameObjects.Image
  private dragQtyText!: Phaser.GameObjects.Text

  private player!: Player
  private craftingSystem!: CraftingSystem
  private uiManager!: UIManager

  private get inventoryUI(): any { return this.uiManager?.getUI("inventory") }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.build()
  }

  // ─── BUILD ──────────────────────────────────────────────────────────────────

  private build() {
    this.container = this.scene.add.container(0, 0).setDepth(220).setVisible(false)

    new TilemapUIBackground(
      this.scene, "craft-tilemap", "craftTiles", 0, 0, UI_SCALE, this.container
    )

    // Blocker — stops world clicks leaking through the panel
    this.container.add(
      this.scene.add
        .rectangle(0, 0, 11 * TILE_SIZE * UI_SCALE, 8 * TILE_SIZE * UI_SCALE, 0x000000, 0)
        .setInteractive()
        .on("pointerdown", (_: any, __: any, ___: any, e: Phaser.Types.Input.EventData) =>
          e.stopPropagation()
        )
    )

    // Close button
    this.container.add(
      this.scene.add
        .rectangle(260, -140, 48, 48, 0xff0000, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.hide())
    )

    // ── 5×5 Inventory Grid ──────────────────────────────────────────────────
    for (let i = 0; i < 25; i++) {
      const r = Math.floor(i / 5)
      const c = i % 5
      const slot = this.makeSlot(
        INV_START_X + c * SLOT_STEP,
        INV_START_Y + r * SLOT_STEP,
        SLOT_SIZE
      )
        ; (slot.getAt(0) as Phaser.GameObjects.Rectangle).on(
          "pointerdown",
          (p: Phaser.Input.Pointer, _: any, __: any, e: Phaser.Types.Input.EventData) => {
            e.stopPropagation()
            this.onInvClick(i, p)
          }
        )
      this.inventorySlots.push(slot)
      this.container.add(slot)
    }

    // ── 3×3 Craft Grid ──────────────────────────────────────────────────────
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const slot = this.makeSlot(
          CRAFT_START_X + c * SLOT_STEP,
          CRAFT_START_Y + r * SLOT_STEP,
          SLOT_SIZE
        )
          ; (slot.getAt(0) as Phaser.GameObjects.Rectangle).on(
            "pointerdown",
            (p: Phaser.Input.Pointer, _: any, __: any, e: Phaser.Types.Input.EventData) => {
              e.stopPropagation()
              this.onCraftClick(r, c, p)
            }
          )
        this.craftSlots.push(slot)
        this.container.add(slot)
      }
    }

    // ── Output Slot ─────────────────────────────────────────────────────────
    this.outputSlot = this.makeSlot(OUTPUT_X, OUTPUT_Y, SLOT_SIZE + 10)
      ; (this.outputSlot.getAt(0) as Phaser.GameObjects.Rectangle).on(
        "pointerdown",
        (p: Phaser.Input.Pointer, _: any, __: any, e: Phaser.Types.Input.EventData) => {
          e.stopPropagation()
          this.onOutputClick(p)
        }
      )
    this.container.add(this.outputSlot)

    // ── Drag icon — SCREEN SPACE (setScrollFactor 0) ─────────────────────────
    // This is the key fix: using setScrollFactor(0) means the sprite is
    // positioned in screen pixels, so pointer.x / pointer.y always aligns
    // perfectly regardless of where the camera has scrolled.
    this.dragIcon = this.scene.add
      .image(0, 0, "")
      .setScale(2.2)
      .setVisible(false)
      .setDepth(300)
      .setScrollFactor(0)

    this.dragQtyText = this.scene.add
      .text(0, 0, "", {
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        fontFamily: "Alagard",
      })
      .setOrigin(1)
      .setVisible(false)
      .setDepth(301)
      .setScrollFactor(0)
  }

  private makeSlot(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y)
    const bg = this.scene.add
      .rectangle(0, 0, size, size, 0x1a1a1a, 0)
      .setStrokeStyle(1.5, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
    const ic = this.scene.add
      .image(0, 0, "")
      .setScale(2.2)
      .setVisible(false)
      .setTint(0xffffff)
    const qty = this.scene.add
      .text(size / 2 - 4, size / 2 - 4, "", {
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
        fontFamily: "Alagard",
      })
      .setOrigin(1)
      .setVisible(false)
    c.add([bg, ic, qty])
    return c
  }

  // ─── SHOW / HIDE ────────────────────────────────────────────────────────────

  show(player: Player, craftingSystem: CraftingSystem) {
    this.player = player
    this.craftingSystem = craftingSystem
    this.isOpen = true
    this.container.setVisible(true)
    this.syncPosition()
    this.refreshUI()
  }

  hide() {
    if (!this.player) return
    this.returnCraftGridToInventory()
    this.dropHeldToInventory()
    this.isOpen = false
    this.container.setVisible(false)
  }

  isOpenNow() { return this.isOpen }
  setManager(m: UIManager) { this.uiManager = m }

  // ─── CLICK LOGIC — MINECRAFT RULES ──────────────────────────────────────────

  private onInvClick(idx: number, p: Phaser.Input.Pointer) {
    const raw = this.player.inventory.getItem(idx)
    const slotItem = raw?.item ?? null
    const slotQty = raw?.quantity ?? 0

    if (p.rightButtonDown()) {
      if (!this.held) {
        // Pick up half (rounded up)
        if (slotItem) {
          const half = Math.ceil(slotQty / 2)
          this.player.inventory.removeItem(idx, half)
          this.held = { itemId: slotItem.id, count: half }
        }
      } else {
        // Place 1 — only into empty slot or matching item
        if (!slotItem || slotItem.id === this.held.itemId) {
          const item = ITEMS[this.held.itemId]
          if (item) {
            this.player.inventory.addItem(item, 1)
            this.held.count--
            if (this.held.count <= 0) this.held = null
          }
        }
      }
    } else {
      if (!this.held) {
        // Pick up full stack
        if (slotItem) {
          this.held = { itemId: slotItem.id, count: slotQty }
          this.player.inventory.removeItem(idx, slotQty)
        }
      } else {
        if (!slotItem) {
          // Place held into empty slot
          const item = ITEMS[this.held.itemId]
          if (item) {
            this.player.inventory.addItem(item, this.held.count)
            this.held = null
          }
        } else if (slotItem.id === this.held.itemId) {
          // Merge stacks
          const max = slotItem.maxStack ?? 64
          const canFit = max - slotQty
          const toPlace = Math.min(canFit, this.held.count)
          if (toPlace > 0) {
            this.player.inventory.addItem(slotItem, toPlace)
            this.held.count -= toPlace
            if (this.held.count <= 0) this.held = null
          }
        } else {
          // Swap — capture both sides first to avoid mutation order bugs
          const pickupId = slotItem.id
          const pickupQty = slotQty
          const heldItem = ITEMS[this.held.itemId]!

          this.player.inventory.removeItem(idx, pickupQty)
          this.player.inventory.addItem(heldItem, this.held.count)
          this.held = { itemId: pickupId, count: pickupQty }
        }
      }
    }

    this.refreshUI()
  }

  private onCraftClick(r: number, c: number, p: Phaser.Input.Pointer) {
    if (!this.validCoord(r, c)) return
    const existing = this.craftGrid[r][c]

    if (p.rightButtonDown()) {
      if (!this.held) {
        if (existing) {
          const half = Math.ceil(existing.count / 2)
          this.held = { itemId: existing.itemId, count: half }
          existing.count -= half
          if (existing.count <= 0) this.craftGrid[r][c] = null
        }
      } else {
        if (!existing) {
          this.craftGrid[r][c] = { itemId: this.held.itemId, count: 1 }
          this.held.count--
          if (this.held.count <= 0) this.held = null
        } else if (existing.itemId === this.held.itemId) {
          existing.count++
          this.held.count--
          if (this.held.count <= 0) this.held = null
        }
        // Different item on right-click → no-op
      }
    } else {
      if (!this.held) {
        if (existing) {
          this.held = { itemId: existing.itemId, count: existing.count }
          this.craftGrid[r][c] = null
        }
      } else {
        if (!existing) {
          this.craftGrid[r][c] = { itemId: this.held.itemId, count: this.held.count }
          this.held = null
        } else if (existing.itemId === this.held.itemId) {
          existing.count += this.held.count
          this.held = null
        } else {
          // Swap
          const tmp = { itemId: existing.itemId, count: existing.count }
          this.craftGrid[r][c] = { itemId: this.held.itemId, count: this.held.count }
          this.held = tmp
        }
      }
    }

    this.refreshUI()
  }

  private onOutputClick(p: Phaser.Input.Pointer) {
    if (!this.currentRecipe) return
    const output = ITEMS[this.currentRecipe.outputItemId]
    if (!output) return

    // Holding a different item — can't collect
    if (this.held && this.held.itemId !== output.id) return

    const times = p.rightButtonDown()
      ? this.craftingSystem.maxCraftCount(this.craftGrid, this.currentRecipe)
      : 1
    if (times === 0) return

    const totalQty = this.currentRecipe.outputQty * times
    const maxStack = output.maxStack ?? 64
    const onCursor = this.held?.count ?? 0
    const afterCursor = onCursor + totalQty

    if (afterCursor <= maxStack) {
      this.craftingSystem.consumeIngredients(this.craftGrid, this.currentRecipe, times)
      this.held = { itemId: output.id, count: afterCursor }
    } else {
      const overflow = afterCursor - maxStack
      const ok = this.player.inventory.addItem(output, overflow)
      if (!ok) return
      this.craftingSystem.consumeIngredients(this.craftGrid, this.currentRecipe, times)
      this.held = { itemId: output.id, count: maxStack }
    }

    this.refreshUI()
  }

  // ─── LEGACY DRAG COMPATIBILITY (InventoryUI.ts calls these) ─────────────────

  handleDrop(r: number, c: number, itemId: string, count: number): number {
    if (!this.validCoord(r, c)) return 0
    const existing = this.craftGrid[r][c]
    if (!existing) {
      this.craftGrid[r][c] = { itemId, count }
      this.refreshUI()
      return count
    }
    if (existing.itemId === itemId) {
      existing.count += count
      this.refreshUI()
      return count
    }
    return 0
  }

  handleRightClickDrop(r: number, c: number, itemId: string): boolean {
    if (!this.validCoord(r, c)) return false  // ← fixes the line-181 crash
    const existing = this.craftGrid[r][c]
    if (!existing) {
      this.craftGrid[r][c] = { itemId, count: 1 }
      this.refreshUI()
      return true
    }
    if (existing.itemId === itemId) {
      existing.count++
      this.refreshUI()
      return true
    }
    return false
  }

  removeFromSlot(r: number, c: number, count: number) {
    if (!this.validCoord(r, c)) return
    const slot = this.craftGrid[r][c]
    if (!slot) return
    slot.count -= count
    if (slot.count <= 0) this.craftGrid[r][c] = null
    this.refreshUI()
  }

  // ─── HIT TESTING (InventoryUI drag system calls this) ────────────────────────

  getSlotAtPosition(x: number, y: number) {
    if (!this.isOpen) return null
    for (let i = 0; i < this.craftSlots.length; i++) {
      const b = (this.craftSlots[i].getAt(0) as Phaser.GameObjects.Rectangle).getBounds()
      if (x >= b.x && x <= b.right && y >= b.y && y <= b.bottom)
        return { type: "craft", r: Math.floor(i / 3), c: i % 3 }
    }
    for (let i = 0; i < this.inventorySlots.length; i++) {
      const b = (this.inventorySlots[i].getAt(0) as Phaser.GameObjects.Rectangle).getBounds()
      if (x >= b.x && x <= b.right && y >= b.y && y <= b.bottom)
        return { type: "inventory", index: i }
    }
    return null
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private validCoord(r: number, c: number): boolean {
    return typeof r === "number" && typeof c === "number"
      && r >= 0 && r <= 2 && c >= 0 && c <= 2
  }

  private dropHeldToInventory() {
    if (!this.held || !this.player) return
    const item = ITEMS[this.held.itemId]
    if (item) this.player.inventory.addItem(item, this.held.count)
    this.held = null
    this.syncDragIcon()
  }

  private returnCraftGridToInventory() {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const slot = this.craftGrid[r][c]
        if (slot) {
          const item = ITEMS[slot.itemId]
          if (item) this.player.inventory.addItem(item, slot.count)
          this.craftGrid[r][c] = null
        }
      }
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  refreshUI() {
    if (!this.player) return
    this.drawInventory()
    this.drawCraftGrid()
    this.drawOutput()
    this.syncDragIcon()
    this.inventoryUI?.refreshUI?.()
  }

  /** @deprecated kept for old callers */
  updateUI() { this.refreshUI() }

  private drawInventory() {
    const slots = this.player.inventory.getAllSlots()
    this.inventorySlots.forEach((slot, i) => {
      const ic = slot.getAt(1) as Phaser.GameObjects.Image
      const qty = slot.getAt(2) as Phaser.GameObjects.Text
      const d = slots[i]
      if (d?.item) {
        ic.setTexture(d.item.icon).setVisible(true)
        qty.setText(d.quantity > 1 ? String(d.quantity) : "").setVisible(d.quantity > 1)
      } else {
        ic.setVisible(false)
        qty.setVisible(false)
      }
    })
  }

  private drawCraftGrid() {
    this.craftSlots.forEach((slot, i) => {
      const r = Math.floor(i / 3)
      const c = i % 3
      const ic = slot.getAt(1) as Phaser.GameObjects.Image
      const qty = slot.getAt(2) as Phaser.GameObjects.Text
      const d = this.craftGrid[r]?.[c] ?? null
      if (d && ITEMS[d.itemId]) {
        ic.setTexture(ITEMS[d.itemId].icon).setVisible(true)
        qty.setText(d.count > 1 ? String(d.count) : "").setVisible(d.count > 1)
      } else {
        ic.setVisible(false)
        qty.setVisible(false)
      }
    })
  }

  private drawOutput() {
    this.currentRecipe = this.craftingSystem?.checkRecipe(this.craftGrid) ?? null
    const ic = this.outputSlot.getAt(1) as Phaser.GameObjects.Image
    const qty = this.outputSlot.getAt(2) as Phaser.GameObjects.Text
    if (this.currentRecipe && ITEMS[this.currentRecipe.outputItemId]) {
      const maxTimes = this.craftingSystem.maxCraftCount(this.craftGrid, this.currentRecipe)
      const displayQty = this.currentRecipe.outputQty * maxTimes
      ic.setTexture(ITEMS[this.currentRecipe.outputItemId].icon).setVisible(true)
      qty.setText(displayQty > 1 ? String(displayQty) : "").setVisible(displayQty > 1)
    } else {
      ic.setVisible(false)
      qty.setVisible(false)
    }
  }

  /**
   * Sync the floating drag icon to pointer SCREEN position.
   *
   * Key detail: pointer.x / pointer.y are screen pixels.
   * The drag icon has setScrollFactor(0), so its position IS screen pixels.
   * That's why it never "flies" — there's no camera offset to account for.
   *
   * The old bug used pointer.worldX / pointer.worldY on a world-space sprite,
   * which adds the camera scroll offset on top of the screen position → wrong.
   */
  private syncDragIcon() {
    if (this.held && ITEMS[this.held.itemId]) {
      const p = this.scene.input.activePointer
      this.dragIcon
        .setTexture(ITEMS[this.held.itemId].icon)
        .setPosition(p.x, p.y)      // screen coords ← the fix
        .setVisible(true)
      this.dragQtyText
        .setText(this.held.count > 1 ? String(this.held.count) : "")
        .setPosition(p.x + 14, p.y + 14)
        .setVisible(this.held.count > 1)
    } else {
      this.dragIcon.setVisible(false)
      this.dragQtyText.setVisible(false)
    }
  }

  // ─── GAME LOOP ───────────────────────────────────────────────────────────────

  update() {
    if (!this.isOpen) return
    this.syncPosition()
    // Every frame: keep the drag icon locked to the pointer smoothly
    if (this.held) {
      const p = this.scene.input.activePointer
      this.dragIcon.setPosition(p.x, p.y)
      this.dragQtyText.setPosition(p.x + 14, p.y + 14)
    }
  }

  updatePosition() { this.syncPosition() }

  private syncPosition() {
    const cam = this.scene.cameras.main
    this.container.setPosition(
      cam.scrollX + this.scene.scale.width / 2,
      cam.scrollY + this.scene.scale.height / 2,
    )
  }
}