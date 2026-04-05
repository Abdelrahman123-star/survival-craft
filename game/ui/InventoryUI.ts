import * as Phaser from "phaser"
import { Inventory, InventorySlot } from "../entities/Inventory"
import { ITEMS } from "../config/items"
import { IUI } from "./IUI"
import { UIManager } from "./UIManager"
import { TilemapUIBackground } from "./TilemapUIBackground"
import { CraftingSystem, Recipe, GridSlot } from "../systems/CraftingSystem"

// Layout Constants
const UI_SCALE = 3.5
const TILE_SIZE = 16
const SLOT_SIZE = 50
const SLOT_STEP = TILE_SIZE * UI_SCALE // 56px

// Inventory Grid (Left 5x5)
const INV_GRID_START_X = -196 // Row 2, Col 1 (-56 * 3.5)
const INV_GRID_START_Y = -84  // Row 2, Col 1 (-24 * 3.5)

// Mini-Crafting (Right 2x2)
const CRAFT_GRID_X = 139
const CRAFT_GRID_Y = -28
const OUTPUT_SLOT_X = 168
const OUTPUT_SLOT_Y = 90

interface HeldStack { itemId: string; count: number }

export class InventoryUI implements IUI {
    private static readonly HOTBAR_SLOTS = 9
    private scene: Phaser.Scene
    private inventory: Inventory
    private container!: Phaser.GameObjects.Container
    private overlay!: Phaser.GameObjects.Rectangle
    private slots: Phaser.GameObjects.Container[] = []
    private isOpen: boolean = false

    private player: any
    private uiManager!: UIManager
    private get craftingUI(): any { return this.uiManager?.getUI("crafting") }
    private hotbarSlots: Phaser.GameObjects.Container[] = []
    private selectedHotbarIndex: number = 0
    private hotbarContainer!: Phaser.GameObjects.Container

    // Crafting System additions
    private craftingSystem: CraftingSystem = new CraftingSystem()
    private miniCraftGrid: (GridSlot | null)[][] = [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ]
    private miniCraftSlots: Phaser.GameObjects.Container[] = []
    private miniOutputSlot!: Phaser.GameObjects.Container
    private currentMiniRecipe: Recipe | null = null

    // Minecraft-style Held Item
    private held: HeldStack | null = null
    private dragIcon!: Phaser.GameObjects.Image
    private dragQtyText!: Phaser.GameObjects.Text

    constructor(scene: Phaser.Scene, inventory: Inventory, player: any) {
        this.scene = scene
        this.inventory = inventory
        this.player = player
        this.createHotbar()
        this.createInventoryUI()
        this.setupHotbarControls()
        this.syncPlayerEquipment()
        this.refreshUI()
    }

    private syncPlayerEquipment() {
        const s = this.inventory.getItem(this.selectedHotbarIndex)
        this.player.setEquippedItem(s?.item?.id ?? null)
    }

    private createHotbar() {
        this.hotbarContainer = this.scene.add.container(0, 0).setDepth(100)
        const ss = 50, sp = 5, sx = -(InventoryUI.HOTBAR_SLOTS * (ss + sp)) / 2
        for (let i = 0; i < InventoryUI.HOTBAR_SLOTS; i++) {
            const c = this.scene.add.container(sx + i * (ss + sp), 0)
            const bg = this.scene.add.rectangle(0, 0, ss, ss, 0x333333, 0.8).setStrokeStyle(2, i === this.selectedHotbarIndex ? 0xFFD700 : 0x666666).setInteractive({ useHandCursor: true })
            const ic = this.scene.add.image(0, 0, '').setScale(2).setVisible(false)
            const q = this.scene.add.text(15, 15, '', { fontSize: '12px', color: '#fff', fontStyle: 'bold', fontFamily: 'Alagard' }).setOrigin(1).setVisible(false)
            c.add([bg, this.scene.add.text(-15, -15, (i + 1).toString(), { fontSize: '10px', color: '#ccc', fontFamily: 'Alagard' }), ic, q])
            this.hotbarSlots.push(c)
            this.hotbarContainer.add(c)
            bg.on('pointerdown', (p: any) => { if (!p.rightButtonDown()) this.selectHotbarSlot(i) })
        }
    }

    private createInventoryUI() {
        this.overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.6)
            .setDepth(200).setVisible(false).setInteractive().on('pointerdown', () => {
                if (this.held) {
                    this.dropHeldToGround()
                } else {
                    this.toggle()
                }
            })

        this.container = this.scene.add.container(0, 0).setDepth(201).setVisible(false)

        new TilemapUIBackground(this.scene, "inventory-map", "inventory-tilemap", 0, 0, UI_SCALE, this.container)

        const blocker = this.scene.add.rectangle(0, 0, 160 * UI_SCALE, 128 * UI_SCALE, 0x000000, 0)
            .setInteractive()
            .on("pointerdown", (_: any, __: any, ___: any, e: { stopPropagation: () => void }) => e.stopPropagation())
        this.container.add(blocker)

        const closeZone = this.scene.add.rectangle(65, -150, 48, 48, 0xff0000, 0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.toggle())
        this.container.add(closeZone)

        const goldText = this.scene.add.text(250, 195, '', {
            fontSize: '20px', color: '#FFD700', fontStyle: 'bold', fontFamily: 'Alagard'
        }).setOrigin(1, 0.5).setName("goldDisplay")
        this.container.add(goldText)

        // 5x5 Inventory Grid
        for (let i = 0; i < 25; i++) {
            const r = Math.floor(i / 5)
            const c = i % 5
            const slot = this.createSlot(INV_GRID_START_X + c * SLOT_STEP, INV_GRID_START_Y + r * SLOT_STEP, SLOT_SIZE)
            this.slots.push(slot)
            const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle
            bg.on('pointerdown', (p: any, lx: any, ly: any, e: any) => {
                e.stopPropagation()
                this.onInvClick(i, p)
            }).on('pointerover', () => this.showTooltip(i)).on('pointerout', () => this.hideTooltip())
            this.container.add(slot)
        }

        // 2x2 Mini Crafting Grid
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
                const slot = this.createSlot(CRAFT_GRID_X + c * SLOT_STEP, CRAFT_GRID_Y + r * SLOT_STEP, SLOT_SIZE)
                this.miniCraftSlots.push(slot)
                const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle
                bg.on('pointerdown', (p: any, lx: any, ly: any, e: any) => {
                    e.stopPropagation()
                    this.onMiniCraftClick(r, c, p)
                })
                this.container.add(slot)
            }
        }

        // Mini Crafting Output
        this.miniOutputSlot = this.createSlot(OUTPUT_SLOT_X, OUTPUT_SLOT_Y, SLOT_SIZE + 10)
        const outBg = this.miniOutputSlot.getAt(0) as Phaser.GameObjects.Rectangle
        outBg.on('pointerdown', (p: any, lx: any, ly: any, e: any) => {
            e.stopPropagation()
            this.onMiniOutputClick(p)
        })
        this.container.add(this.miniOutputSlot)

        // Drag Icon logic
        this.dragIcon = this.scene.add.image(0, 0, "").setScale(2.2).setVisible(false).setDepth(300).setScrollFactor(0)
        this.dragQtyText = this.scene.add.text(0, 0, "", {
            fontSize: "13px", color: "#ffffff", fontStyle: "bold", fontFamily: "Alagard",
        }).setOrigin(1).setVisible(false).setDepth(301).setScrollFactor(0)
    }

    private createSlot(x: number, y: number, size: number): Phaser.GameObjects.Container {
        const c = this.scene.add.container(x, y)
        const bg = this.scene.add.rectangle(0, 0, size, size, 0x1a1a1a, 0).setStrokeStyle(1.5, 0x000000, 0).setInteractive({ useHandCursor: true })
        const ic = this.scene.add.image(0, 0, '').setScale(2.2).setVisible(false).setTint(0xffffff)
        const q = this.scene.add.text(size / 2 - 4, size / 2 - 4, '', { fontSize: '13px', color: '#fff', fontStyle: 'bold', fontFamily: 'Alagard' }).setOrigin(1).setVisible(false)
        c.add([bg, ic, q])
        return c
    }

    private setupHotbarControls() {
        const ks = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE']
        ks.forEach((k, i) => this.scene.input.keyboard?.on(`keydown-${k}`, () => this.selectHotbarSlot(i)))
    }

    public selectHotbarSlot(idx: number) {
        this.selectedHotbarIndex = Phaser.Math.Clamp(idx, 0, InventoryUI.HOTBAR_SLOTS - 1)
        this.hotbarSlots.forEach((s, i) => (s.getAt(0) as any).setStrokeStyle(2, i === this.selectedHotbarIndex ? 0xFFD700 : 0x666666))
        this.syncPlayerEquipment()
    }

    // ─── CLICK LOGIC ──────────────────────────────────────────────────────────

    private onInvClick(idx: number, p: Phaser.Input.Pointer) {
        const raw = this.inventory.getItem(idx)
        const slotItem = raw?.item ?? null
        const slotQty = raw?.quantity ?? 0

        if (p.rightButtonDown()) {
            if (!this.held) {
                if (slotItem) {
                    const half = Math.ceil(slotQty / 2)
                    this.inventory.removeItem(idx, half)
                    this.held = { itemId: slotItem.id, count: half }
                }
            } else {
                if (!slotItem || slotItem.id === this.held.itemId) {
                    const item = ITEMS[this.held.itemId]
                    if (item) {
                        this.inventory.addItem(item, 1)
                        this.held.count--
                        if (this.held.count <= 0) this.held = null
                    }
                }
            }
        } else {
            if (!this.held) {
                if (slotItem) {
                    this.held = { itemId: slotItem.id, count: slotQty }
                    this.inventory.removeItem(idx, slotQty)
                }
            } else {
                if (!slotItem) {
                    const item = ITEMS[this.held.itemId]
                    if (item) {
                        this.inventory.addItem(item, this.held.count)
                        this.held = null
                    }
                } else if (slotItem.id === this.held.itemId) {
                    const max = slotItem.maxStack ?? 64
                    const canFit = max - slotQty
                    const toPlace = Math.min(canFit, this.held.count)
                    if (toPlace > 0) {
                        this.inventory.addItem(slotItem, toPlace)
                        this.held.count -= toPlace
                        if (this.held.count <= 0) this.held = null
                    }
                } else {
                    const pickupId = slotItem.id
                    const pickupQty = slotQty
                    const heldItem = ITEMS[this.held.itemId]!
                    this.inventory.removeItem(idx, pickupQty)
                    this.inventory.addItem(heldItem, this.held.count)
                    this.held = { itemId: pickupId, count: pickupQty }
                }
            }
        }
        this.refreshUI()
        this.syncPlayerEquipment()
    }

    private onMiniCraftClick(r: number, c: number, p: Phaser.Input.Pointer) {
        const existing = this.miniCraftGrid[r][c]

        if (p.rightButtonDown()) {
            if (!this.held) {
                if (existing) {
                    const half = Math.ceil(existing.count / 2)
                    this.held = { itemId: existing.itemId, count: half }
                    existing.count -= half
                    if (existing.count <= 0) this.miniCraftGrid[r][c] = null
                }
            } else {
                if (!existing) {
                    this.miniCraftGrid[r][c] = { itemId: this.held.itemId, count: 1 }
                    this.held.count--
                    if (this.held.count <= 0) this.held = null
                } else if (existing.itemId === this.held.itemId) {
                    existing.count++
                    this.held.count--
                    if (this.held.count <= 0) this.held = null
                }
            }
        } else {
            if (!this.held) {
                if (existing) {
                    this.held = { itemId: existing.itemId, count: existing.count }
                    this.miniCraftGrid[r][c] = null
                }
            } else {
                if (!existing) {
                    this.miniCraftGrid[r][c] = { itemId: this.held.itemId, count: this.held.count }
                    this.held = null
                } else if (existing.itemId === this.held.itemId) {
                    existing.count += this.held.count
                    this.held = null
                } else {
                    const tmp = { itemId: existing.itemId, count: existing.count }
                    this.miniCraftGrid[r][c] = { itemId: this.held.itemId, count: this.held.count }
                    this.held = tmp
                }
            }
        }
        this.refreshUI()
    }

    private onMiniOutputClick(p: Phaser.Input.Pointer) {
        if (!this.currentMiniRecipe) return
        const output = ITEMS[this.currentMiniRecipe.outputItemId]
        if (!output) return

        if (this.held && this.held.itemId !== output.id) return

        const times = p.rightButtonDown() ? this.craftingSystem.maxCraftCount(this.miniCraftGrid, this.currentMiniRecipe) : 1
        if (times === 0) return

        const totalQty = this.currentMiniRecipe.outputQty * times
        const maxStack = output.maxStack ?? 64
        const onCursor = this.held?.count ?? 0
        const afterCursor = onCursor + totalQty

        if (afterCursor <= maxStack) {
            this.craftingSystem.consumeIngredients(this.miniCraftGrid, this.currentMiniRecipe, times)
            this.held = { itemId: output.id, count: afterCursor }
        } else {
            const overflow = afterCursor - maxStack
            const ok = this.player.inventory.addItem(output, overflow)
            if (!ok) return
            this.craftingSystem.consumeIngredients(this.miniCraftGrid, this.currentMiniRecipe, times)
            this.held = { itemId: output.id, count: maxStack }
        }
        this.refreshUI()
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

    private dropHeldToGround() {
        if (!this.held || !this.player) return
        const item = ITEMS[this.held.itemId]
        if (item) {
            this.scene.events.emit('itemDroppedOutside', { item: item, quantity: this.held.count })
        }
        this.held = null
        this.syncDragIcon()
    }

    private dropHeldToInventory() {
        if (!this.held || !this.player) return
        const item = ITEMS[this.held.itemId]
        if (item) {
            if (!this.inventory.addItem(item, this.held.count)) {
                // Drop to ground if inventory full
                this.scene.events.emit('itemDroppedOutside', { item: item, quantity: this.held.count })
            }
        }
        this.held = null
        this.syncDragIcon()
    }

    private returnCraftGridToInventory() {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const slot = this.miniCraftGrid[r][c]
                if (slot) {
                    const item = ITEMS[slot.itemId]
                    if (item) this.inventory.addItem(item, slot.count)
                    this.miniCraftGrid[r][c] = null
                }
            }
        }
    }

    refreshUI() {
        if (!this.player) return
        const goldText = this.container.getByName("goldDisplay") as Phaser.GameObjects.Text;
        if (goldText) goldText.setText(`🪙 ${this.inventory.getGold()}`)

        // Update 5x5 Inventory
        const slts = this.inventory.getAllSlots()
        this.slots.forEach((c, i) => {
            const s = slts[i], ic = c.getAt(1) as any, q = c.getAt(2) as any
            if (s?.item) {
                const tex = this.scene.textures.get(s.item.icon)
                const width = (tex.getSourceImage() as any).width || 16
                const scale = width > 20 ? 1.1 : 2.2
                ic.setTexture(s.item.icon).setScale(scale).setVisible(true)
                q.setText(s.quantity > 1 ? String(s.quantity) : "").setVisible(s.quantity > 1)
            } else { ic.setVisible(false); q.setVisible(false) }
        })

        // Update Hotbar
        this.hotbarSlots.forEach((c, i) => {
            const s = slts[i], ic = c.getAt(2) as any, q = c.getAt(3) as any
            if (s?.item) {
                const tex = this.scene.textures.get(s.item.icon)
                const width = (tex.getSourceImage() as any).width || 16
                const scale = width > 20 ? 1 : 2
                ic.setTexture(s.item.icon).setScale(scale).setVisible(true)
                q.setText(s.quantity > 1 ? String(s.quantity) : "").setVisible(s.quantity > 1)
            } else { ic.setVisible(false); q.setVisible(false) }
        })

        // Update Mini 2x2 Craft Grid
        this.miniCraftSlots.forEach((slot, i) => {
            const r = Math.floor(i / 2)
            const c = i % 2
            const ic = slot.getAt(1) as Phaser.GameObjects.Image
            const qty = slot.getAt(2) as Phaser.GameObjects.Text
            const d = this.miniCraftGrid[r]?.[c] ?? null
            if (d && ITEMS[d.itemId]) {
                const item = ITEMS[d.itemId]
                const tex = this.scene.textures.get(item.icon)
                const width = (tex.getSourceImage() as any).width || 16
                const scale = width > 20 ? 1.1 : 2.2
                ic.setTexture(item.icon).setScale(scale).setVisible(true)
                qty.setText(d.count > 1 ? String(d.count) : "").setVisible(d.count > 1)
            } else {
                ic.setVisible(false)
                qty.setVisible(false)
            }
        })

        // Update Mini Craft Output
        this.currentMiniRecipe = this.craftingSystem.checkRecipe(this.miniCraftGrid) ?? null
        const outIc = this.miniOutputSlot.getAt(1) as Phaser.GameObjects.Image
        const outQty = this.miniOutputSlot.getAt(2) as Phaser.GameObjects.Text
        if (this.currentMiniRecipe && ITEMS[this.currentMiniRecipe.outputItemId]) {
            const maxTimes = this.craftingSystem.maxCraftCount(this.miniCraftGrid, this.currentMiniRecipe)
            const displayQty = this.currentMiniRecipe.outputQty * maxTimes
            const item = ITEMS[this.currentMiniRecipe.outputItemId]
            const tex = this.scene.textures.get(item.icon)
            const width = (tex.getSourceImage() as any).width || 16
            const scale = width > 20 ? 1.1 : 2.2
            outIc.setTexture(item.icon).setScale(scale).setVisible(true)
            outQty.setText(displayQty > 1 ? String(displayQty) : "").setVisible(displayQty > 1)
        } else {
            outIc.setVisible(false)
            outQty.setVisible(false)
        }

        this.syncDragIcon()
    }

    private syncDragIcon() {
        if (this.held && ITEMS[this.held.itemId]) {
            const p = this.scene.input.activePointer
            const item = ITEMS[this.held.itemId]
            const tex = this.scene.textures.get(item.icon)
            const width = (tex.getSourceImage() as any).width || 16
            const scale = width > 20 ? 1.1 : 2.2
            this.dragIcon.setTexture(item.icon).setScale(scale).setPosition(p.x, p.y).setVisible(true)
            this.dragQtyText.setText(this.held.count > 1 ? String(this.held.count) : "").setPosition(p.x + 14, p.y + 14).setVisible(this.held.count > 1)
        } else {
            this.dragIcon.setVisible(false)
            this.dragQtyText.setVisible(false)
        }
    }

    updatePosition() {
        const cam = this.scene.cameras.main
        this.container.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height / 2)
        this.overlay.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height / 2)
    }

    toggle(force?: boolean) {
        this.isOpen = force !== undefined ? force : !this.isOpen
        this.player.setMovementEnabled(!this.isOpen)
        if (this.isOpen) {
            this.updatePosition()
            this.overlay.setVisible(true)
            this.container.setVisible(true)
        } else {
            this.overlay.setVisible(false)
            this.container.setVisible(false)
            this.returnCraftGridToInventory()
            this.dropHeldToInventory()
        }
        this.refreshUI()
    }

    update() {
        const cam = this.scene.cameras.main
        this.hotbarContainer.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height - 70)
        if (this.isOpen) this.updatePosition()
        if (this.held) {
            const p = this.scene.input.activePointer
            this.dragIcon.setPosition(p.x, p.y)
            this.dragQtyText.setPosition(p.x + 14, p.y + 14)

            // Drop on ground
            if (!p.isDown && !p.rightButtonDown() && this.isOpen) {
                // Minecraft typically requires clicking outside the GUI window
                // Wait, we don't auto-drop unless clicking outside bounds, but currently held stays on cursor
            }
        }
    }

    getSelectedHotbarItem(): InventorySlot | null { return this.inventory.getItem(this.selectedHotbarIndex) }
    getSelectedHotbarIndex(): number { return this.selectedHotbarIndex }
    isOpenNow(): boolean { return this.isOpen }
    setManager(manager: UIManager) { this.uiManager = manager }
}
