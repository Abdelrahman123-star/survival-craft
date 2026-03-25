import * as Phaser from "phaser"
import { Inventory, InventorySlot } from "../entities/Inventory"
import { ITEMS } from "../config/items"

export class InventoryUI {
  private static readonly HOTBAR_SLOTS = 9
  private scene: Phaser.Scene
  private inventory: Inventory
  private container!: Phaser.GameObjects.Container
  private overlay!: Phaser.GameObjects.Rectangle
  private slots: Phaser.GameObjects.Container[] = []
  private isOpen: boolean = false

  private dragSlot: { index: number | string, slot: InventorySlot } | null = null
  private dragSprite: Phaser.GameObjects.Image | null = null
  private lastPlacedGridSlot: { r: number, c: number } | null = null

  private player: any
  private craftingUI: any
  private hotbarSlots: Phaser.GameObjects.Container[] = []
  private selectedHotbarIndex: number = 0

  constructor(scene: Phaser.Scene, inventory: Inventory, player: any) {
    this.scene = scene; this.inventory = inventory; this.player = player
    this.createHotbar(); this.createInventoryUI(); this.setupHotbarControls(); this.syncPlayerEquipment(); this.refreshUI()
  }

  private syncPlayerEquipment() { const s = this.inventory.getItem(this.selectedHotbarIndex); this.player.setEquippedItem(s?.item?.id ?? null) }

  private createHotbar() {
    this.hotbarContainer = this.scene.add.container(0, 0).setDepth(100)
    const ss = 50, sp = 5, sx = -(InventoryUI.HOTBAR_SLOTS * (ss + sp)) / 2
    for (let i = 0; i < InventoryUI.HOTBAR_SLOTS; i++) {
      const c = this.scene.add.container(sx + i * (ss + sp), 0)
      const bg = this.scene.add.rectangle(0, 0, ss, ss, 0x333333, 0.8).setStrokeStyle(2, i === 0 ? 0xFFD700 : 0x666666).setInteractive({ useHandCursor: true })
      const ic = this.scene.add.image(0, 0, '').setScale(2).setVisible(false)
      const q = this.scene.add.text(15, 15, '', { fontSize: '12px', color: '#fff', fontStyle: 'bold', fontFamily: 'Alagard' }).setOrigin(1).setVisible(false)
      c.add([bg, this.scene.add.text(-15, -15, (i + 1).toString(), { fontSize: '10px', color: '#ccc', fontFamily: 'Alagard' }), ic, q])
      this.hotbarSlots.push(c); this.hotbarContainer.add(c)
      bg.on('pointerdown', (p: any) => { if (!p.rightButtonDown()) this.selectHotbarSlot(i) })
    }
  }
  private hotbarContainer!: Phaser.GameObjects.Container

  private createInventoryUI() {
    this.overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.6)
      .setDepth(200).setVisible(false).setInteractive().on('pointerdown', () => this.toggle())
    this.container = this.scene.add.container(0, 0).setDepth(201).setVisible(false)
    const pnl = this.scene.add.rectangle(0, 0, 500, 400, 0x222222, 0.98).setStrokeStyle(2, 0xffffff, 0.3).setInteractive().on('pointerdown', (p: any, lx: any, ly: any, e: any) => e.stopPropagation())
    const title = this.scene.add.text(-230, -180, 'Inventory', { fontSize: '24px', color: '#fff', fontStyle: 'bold', fontFamily: 'Alagard' })
    const gld = this.scene.add.text(150, -180, '', { fontSize: '20px', color: '#FFD700', fontFamily: 'Alagard' })
    this.container.add([pnl, title, gld])
    const ss = 50, sp = 5, sx = -(8 * (ss + sp)) / 2, sy = -110
    for (let i = 0; i < 20; i++) {
      const c = this.scene.add.container(sx + (i % 8) * (ss + sp), sy + Math.floor(i / 8) * (ss + sp))
      const bg = this.scene.add.rectangle(0, 0, ss, ss, 0x444444, 0.95).setStrokeStyle(1.5, 0x888888).setInteractive({ useHandCursor: true })
      const ic = this.scene.add.image(0, 0, '').setScale(2.5).setVisible(false).setTint(0xffffff)
      const q = this.scene.add.text(15, 15, '', { fontSize: '14px', color: '#fff', fontStyle: 'bold', fontFamily: 'Alagard' }).setOrigin(1).setVisible(false)
      c.add([bg, ic, q]); this.slots.push(c)
      bg.on('pointerdown', (p: any, lx: any, ly: any, e: any) => { e.stopPropagation(); this.handleSlotClick(i, p) })
        .on('pointerover', () => this.showTooltip(i)).on('pointerout', () => this.hideTooltip())
      this.container.add(c)
    }
  }

  private setupHotbarControls() { const ks = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']; ks.forEach((k, i) => this.scene.input.keyboard?.on(`keydown-${k}`, () => this.selectHotbarSlot(i))) }
  public selectHotbarSlot(idx: number) { this.selectedHotbarIndex = Phaser.Math.Clamp(idx, 0, InventoryUI.HOTBAR_SLOTS - 1); this.hotbarSlots.forEach((s, i) => (s.getAt(0) as any).setStrokeStyle(2, i === this.selectedHotbarIndex ? 0xFFD700 : 0x666666)); this.syncPlayerEquipment() }
  private handleSlotClick(idx: number, p: any) { const s = this.inventory.getItem(idx); if (s?.item) this.startDrag(idx, s) }

  startDrag(idx: number | string, s: InventorySlot) {
    if (this.dragSprite) this.endDrag()
    this.dragSlot = { index: idx, slot: { ...s } }
    this.dragSprite = this.scene.add.image(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY, s.item!.icon).setScale(3.5).setDepth(300).setTint(0xffffff)
    if (typeof idx === "number") { const sc = this.slots[idx]; (sc.getAt(1) as any).setVisible(false); (sc.getAt(2) as any).setVisible(false) }
  }

  private endDrag() {
    if (!this.dragSlot || !this.dragSprite) return
    const x = this.scene.input.activePointer.worldX, y = this.scene.input.activePointer.worldY, gp = this.craftingUI?.getSlotAtPosition(x, y)
    if (gp && this.dragSlot.slot.quantity > 0) {
      const cns = this.craftingUI.handleDrop(gp.r, gp.c, this.dragSlot.slot.item!.id, this.dragSlot.slot.quantity)
      if (cns > 0) this.removeItemsFromSource(cns)
    } else {
      const invIdx = this.getSlotAtPosition(x, y)
      if (invIdx !== -1 && typeof this.dragSlot.index === "number" && invIdx !== this.dragSlot.index) this.inventory.swapSlots(this.dragSlot.index, invIdx)
      else if (invIdx !== -1 && typeof this.dragSlot.index === "string") this.inventory.addItem(this.dragSlot.slot.item!, this.dragSlot.slot.quantity)
      else if (typeof this.dragSlot.index === "string") this.returnItemsToSource()
    }
    this.dragSprite.destroy(); this.dragSprite = null; this.dragSlot = null; this.lastPlacedGridSlot = null
    this.refreshUI(); this.syncPlayerEquipment()
  }

  private removeItemsFromSource(count: number) {
    if (!this.dragSlot) return
    if (typeof this.dragSlot.index === "number") this.inventory.removeItem(this.dragSlot.index, count)
    else { const [r, c] = this.dragSlot.index.split('_').map(Number); this.craftingUI.removeFromSlot(r, c, count) }
  }

  private returnItemsToSource() { if (!this.dragSlot || typeof this.dragSlot.index !== "string") return; const [r, c] = this.dragSlot.index.split('_').map(Number); this.craftingUI.handleDrop(r, c, this.dragSlot.slot.item!.id, this.dragSlot.slot.quantity) }

  private handleDragUpdate() {
    if (!this.dragSlot || !this.dragSprite || this.dragSlot.slot.quantity <= 0) return
    if (this.scene.input.activePointer.rightButtonDown()) {
      const x = this.scene.input.activePointer.worldX, y = this.scene.input.activePointer.worldY, gp = this.craftingUI?.getSlotAtPosition(x, y)
      if (gp && (!this.lastPlacedGridSlot || this.lastPlacedGridSlot.r !== gp.r || this.lastPlacedGridSlot.c !== gp.c)) {
        if (this.craftingUI.handleRightClickDrop(gp.r, gp.c, this.dragSlot.slot.item!.id)) {
          this.removeItemsFromSource(1); this.dragSlot.slot.quantity--
          this.lastPlacedGridSlot = gp; this.refreshUI()
          if (this.dragSlot.slot.quantity <= 0) this.endDrag()
        }
      } else if (!gp) this.lastPlacedGridSlot = null
    }
  }

  private getSlotAtPosition(x: number, y: number): number {
    for (let i = 0; i < this.slots.length; i++) {
      const bg = this.slots[i].getAt(0) as Phaser.GameObjects.Rectangle
      // Using world Coordinates matched against pointer.worldX/Y
      const bounds = bg.getBounds()
      if (x >= bounds.x && x <= bounds.right && y >= bounds.y && y <= bounds.bottom) return i
    }
    return -1
  }

  private showTooltip(idx: number) {
    const s = this.inventory.getItem(idx); if (!s?.item) return
    const t = this.scene.add.container(this.scene.input.activePointer.worldX + 35, this.scene.input.activePointer.worldY + 35).setDepth(350).setScrollFactor(0)
    const bg = this.scene.add.rectangle(0, 0, 200, 80, 0, 0.9).setStrokeStyle(1, 0xffffff, 0.3)
    t.add([bg, this.scene.add.text(-90, -30, s.item.name, { fontSize: '16px', color: '#FFD700', fontStyle: 'bold', fontFamily: 'Alagard' }),
      this.scene.add.text(-90, -10, s.item.description, { fontSize: '12px', color: '#ccc', wordWrap: { width: 180 }, fontFamily: 'Alagard' })])
    this.container.setData('tooltip', t)
  }

  private hideTooltip() { const t = this.container.getData('tooltip'); if (t) t.destroy(); this.container.setData('tooltip', null) }

  refreshUI() {
    const gld = this.container.list[2] as Phaser.GameObjects.Text; if (gld) gld.setText(`🪙 ${this.inventory.getGold()}`)
    const slts = this.inventory.getAllSlots()
    slts.forEach((s, i) => {
      const c = this.slots[i]; if (!c) return
      const ic = c.getAt(1) as any, q = c.getAt(2) as any
      if (s.item) { ic.setTexture(s.item.icon).setVisible(true); q.setText(s.quantity.toString()).setVisible(s.quantity > 1) }
      else { ic.setVisible(false); q.setVisible(false) }
    })
    this.hotbarSlots.forEach((c, i) => {
      const s = slts[i], ic = c.getAt(2) as any, q = c.getAt(3) as any
      if (s?.item) { ic.setTexture(s.item.icon).setVisible(true); q.setText(s.quantity.toString()).setVisible(s.quantity > 1) }
      else { ic.setVisible(false); q.setVisible(false) }
    })
  }

  updatePosition() {
    const cam = this.scene.cameras.main
    const screenX = this.craftingUI?.isOpenNow() ? this.scene.scale.width * 0.72 : this.scene.scale.width / 2
    this.container.setPosition(cam.scrollX + screenX, cam.scrollY + this.scene.scale.height / 2)
    this.overlay.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height / 2)
  }

  toggle(force?: boolean) {
    this.isOpen = force !== undefined ? force : !this.isOpen
    this.player.setMovementEnabled(!this.isOpen)
    if (this.isOpen) { this.updatePosition(); this.overlay.setVisible(true); this.container.setVisible(true) }
    else { this.overlay.setVisible(false); this.container.setVisible(false); if (this.dragSprite) this.endDrag() }
    this.refreshUI()
  }

  update() {
    const cam = this.scene.cameras.main
    // Always sync Hotbar to camera
    this.hotbarContainer.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height - 70)

    if (this.isOpen) this.updatePosition()

    if (this.dragSprite) {
      this.dragSprite.setPosition(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY)
      this.handleDragUpdate()
      if (!this.scene.input.activePointer.isDown && !this.scene.input.activePointer.rightButtonDown()) this.endDrag()
    }
  }

  getSelectedHotbarItem(): InventorySlot | null { return this.inventory.getItem(this.selectedHotbarIndex) }
  getSelectedHotbarIndex(): number { return this.selectedHotbarIndex }
  isOpenNow(): boolean { return this.isOpen }
  setCraftingUI(c: any) { this.craftingUI = c }
}