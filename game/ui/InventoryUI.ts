import * as Phaser from "phaser"
import { Inventory, InventorySlot } from "../entities/Inventory"
import { ITEMS } from "../config/items"

export class InventoryUI {
  private scene: Phaser.Scene
  private inventory: Inventory
  private container!: Phaser.GameObjects.Container
  private slots: Phaser.GameObjects.Container[] = []
  private isOpen: boolean = false
  private dragSlot: { index: number, slot: InventorySlot } | null = null
  private dragSprite: Phaser.GameObjects.Image | null = null
  private player: any // Reference to handle character visual updates

  // Hotbar (quick access)
  private hotbarContainer!: Phaser.GameObjects.Container
  private hotbarSlots: Phaser.GameObjects.Container[] = []
  private selectedHotbarIndex: number = 0

  constructor(scene: Phaser.Scene, inventory: Inventory, player: any) {
    this.scene = scene
    this.inventory = inventory
    this.player = player

    this.createHotbar()
    this.createInventoryUI()

    // Listen for keyboard number keys for hotbar
    this.setupHotbarControls()

    // Initial equipment sync
    this.syncPlayerEquipment()
  }

  private syncPlayerEquipment() {
    const slot = this.inventory.getItem(this.selectedHotbarIndex)
    this.player.setEquippedItem(slot?.item?.id ?? null)
  }

  private createHotbar() {
    this.hotbarContainer = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height - 70)
      .setScrollFactor(0)
      .setDepth(100)

    const slotSize = 50
    const slotsPerRow = 8
    const startX = -(slotsPerRow * (slotSize + 5)) / 2

    // Create 8 hotbar slots
    for (let i = 0; i < 8; i++) {
      const slotContainer = this.scene.add.container(startX + i * (slotSize + 5), 0)

      // Slot background
      const bg = this.scene.add.rectangle(0, 0, slotSize, slotSize, 0x333333, 0.8)
        .setStrokeStyle(2, i === 0 ? 0xFFD700 : 0x666666)

      // Slot number
      const numberText = this.scene.add.text(-15, -15, (i + 1).toString(), {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0)

      // Item icon (hidden initially)
      const icon = this.scene.add.image(0, 0, '')
        .setScale(2)
        .setVisible(false)

      // Item quantity text
      const quantityText = this.scene.add.text(15, 15, '', {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(1).setVisible(false)

      slotContainer.add([bg, numberText, icon, quantityText])

      // Store references
      this.hotbarSlots.push(slotContainer)

      // Make interactive
      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.selectHotbarSlot(i)
        })

      this.hotbarContainer.add(slotContainer)
    }
  }

  private createInventoryUI() {
    // Main inventory panel (initially hidden)
    this.container = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height / 2)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false)

    const panelWidth = 500
    const panelHeight = 400

    // Less dark background overlay
    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.4)
      .setInteractive()
      .on('pointerdown', () => this.toggle())

    // Brighter panel background
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x242424, 0.98)
      .setStrokeStyle(2, 0xffffff, 0.3)

    // Title
    const title = this.scene.add.text(-200, -180, 'Inventory', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    })

    // Gold display
    const goldText = this.scene.add.text(150, -180, `🪙 ${this.inventory.getGold()}`, {
      fontSize: '20px',
      color: '#FFD700',
      fontFamily: 'Arial'
    })

    // Create inventory slots grid
    const slotSize = 45
    const slotsPerRow = 8
    const startX = -(slotsPerRow * (slotSize + 5)) / 2
    const startY = -120

    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / slotsPerRow)
      const col = i % slotsPerRow

      const slotContainer = this.scene.add.container(
        startX + col * (slotSize + 5),
        startY + row * (slotSize + 5)
      )

      // Slot background
      const bg = this.scene.add.rectangle(0, 0, slotSize, slotSize, 0x333333, 0.8)
        .setStrokeStyle(1, 0x666666)

      // Item icon
      const icon = this.scene.add.image(0, 0, '')
        .setScale(2)
        .setVisible(false)

      // Quantity text
      const quantityText = this.scene.add.text(15, 15, '', {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold'
      }).setOrigin(1).setVisible(false)

      slotContainer.add([bg, icon, quantityText])

      // Store reference
      this.slots.push(slotContainer)

      // Make interactive
      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.handleSlotClick(i, pointer)
        })
        .on('pointerover', () => this.showTooltip(i))
        .on('pointerout', () => this.hideTooltip())

      this.container.add(slotContainer)
    }

    // Close button
    const closeBtn = this.scene.add.text(200, 160, '✕', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggle())

    this.container.add([overlay, panel, title, goldText, closeBtn])
  }

  private setupHotbarControls() {
    this.scene.input.keyboard?.on('keydown-ONE', () => this.selectHotbarSlot(0))
    this.scene.input.keyboard?.on('keydown-TWO', () => this.selectHotbarSlot(1))
    this.scene.input.keyboard?.on('keydown-THREE', () => this.selectHotbarSlot(2))
    this.scene.input.keyboard?.on('keydown-FOUR', () => this.selectHotbarSlot(3))
    this.scene.input.keyboard?.on('keydown-FIVE', () => this.selectHotbarSlot(4))
    this.scene.input.keyboard?.on('keydown-SIX', () => this.selectHotbarSlot(5))
    this.scene.input.keyboard?.on('keydown-SEVEN', () => this.selectHotbarSlot(6))
    this.scene.input.keyboard?.on('keydown-EIGHT', () => this.selectHotbarSlot(7))
  }

  private selectHotbarSlot(index: number) {
    this.selectedHotbarIndex = index

    // Update visual selection
    this.hotbarSlots.forEach((slot, i) => {
      const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(2, i === index ? 0xFFD700 : 0x666666)
    })

    this.syncPlayerEquipment()
  }

  private handleSlotClick(index: number, pointer: Phaser.Input.Pointer) {
    const slot = this.inventory.getItem(index)

    if (pointer.rightButtonDown()) {
      // Right click - use/equip item
      this.useItem(index)
    } else {
      // Left click - start drag
      if (slot?.item) {
        this.startDrag(index, slot)
      }
    }
  }

  private startDrag(index: number, slot: InventorySlot) {
    this.dragSlot = { index, slot }

    // Create drag sprite
    this.dragSprite = this.scene.add.image(
      this.scene.input.x,
      this.scene.input.y,
      slot.item!.icon
    )
      .setScale(3)
      .setDepth(250)
      .setScrollFactor(0)

    // Hide original item
    const originalSlot = this.slots[index]
    const icon = originalSlot.getAt(1) as Phaser.GameObjects.Image
    icon.setVisible(false)
    const quantityText = originalSlot.getAt(2) as Phaser.GameObjects.Text
    quantityText.setVisible(false)
  }

  private endDrag() {
    if (!this.dragSlot || !this.dragSprite) return

    // Check if dropped on another slot
    const dropTarget = this.getSlotAtPosition(this.scene.input.x, this.scene.input.y)

    if (dropTarget !== -1 && dropTarget !== this.dragSlot.index) {
      // Swap items
      this.inventory.swapSlots(this.dragSlot.index, dropTarget)
    }

    // Clean up drag
    this.dragSprite.destroy()
    this.dragSprite = null
    this.dragSlot = null

    // Refresh all slots
    this.refreshUI()

    // Sync equipment in case the selected hotbar item changed
    this.syncPlayerEquipment()
  }

  private getSlotAtPosition(x: number, y: number): number {
    // Convert screen coordinates to container local coordinates
    const localX = x - this.container.x
    const localY = y - this.container.y

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]
      const bounds = slot.getBounds()

      if (Phaser.Geom.Rectangle.Contains(bounds, localX + this.container.x, localY + this.container.y)) {
        return i
      }
    }

    return -1
  }

  private useItem(slotIndex: number) {
    const slot = this.inventory.getItem(slotIndex)
    if (!slot?.item) return

    switch (slot.item.type) {
      case 'consumable':
        // Use consumable (heal, etc.)
        if (slot.item.properties.healAmount) {
          // Heal player logic here
        }
        this.inventory.removeItem(slotIndex, 1)
        break

      case 'weapon':
      case 'tool':
        // Equip weapon/tool
        this.equipItem(slotIndex)
        break
    }

    this.refreshUI()
  }

  private equipItem(slotIndex: number) {
    const slot = this.inventory.getItem(slotIndex)
    if (!slot?.item) return

    // Move to hotbar if there's space
    for (let i = 0; i < 8; i++) {
      const hotbarSlot = this.inventory.getItem(i)
      if (!hotbarSlot?.item) {
        this.inventory.swapSlots(slotIndex, i)
        break
      }
    }
  }

  private showTooltip(slotIndex: number) {
    const slot = this.inventory.getItem(slotIndex)
    if (!slot?.item) return

    // Create tooltip
    const tooltip = this.scene.add.container(this.scene.input.x + 10, this.scene.input.y - 10)
      .setDepth(250)
      .setScrollFactor(0)

    const bg = this.scene.add.rectangle(0, 0, 200, 80, 0x000000, 0.9)
      .setStrokeStyle(1, 0xffffff, 0.3)

    const nameText = this.scene.add.text(-90, -30, slot.item.name, {
      fontSize: '16px',
      color: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    })

    const descText = this.scene.add.text(-90, -10, slot.item.description, {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'Arial',
      wordWrap: { width: 180 }
    })

    const typeText = this.scene.add.text(-90, 20, `Type: ${slot.item.type}`, {
      fontSize: '10px',
      color: '#999999',
      fontFamily: 'Arial'
    })

    const valueText = this.scene.add.text(-90, 35, `Value: ${slot.item.properties.value || 0}`, {
      fontSize: '10px',
      color: '#FFD700',
      fontFamily: 'Arial'
    })

    tooltip.add([bg, nameText, descText, typeText, valueText])

    // Store reference
    this.container.setData('tooltip', tooltip)
  }

  private hideTooltip() {
    const tooltip = this.container.getData('tooltip')
    if (tooltip) {
      tooltip.destroy()
      this.container.setData('tooltip', null)
    }
  }

  refreshUI() {
    const slots = this.inventory.getAllSlots()

    // Refresh inventory slots
    slots.forEach((slot, index) => {
      const slotContainer = this.slots[index]
      if (!slotContainer) return

      const icon = slotContainer.getAt(1) as Phaser.GameObjects.Image
      const quantityText = slotContainer.getAt(2) as Phaser.GameObjects.Text

      if (slot.item) {
        icon.setTexture(slot.item.icon).setVisible(true)
        quantityText.setText(slot.quantity.toString()).setVisible(slot.quantity > 1)
      } else {
        icon.setVisible(false)
        quantityText.setVisible(false)
      }
    })

    // Refresh hotbar slots (first 8 slots)
    for (let i = 0; i < 8; i++) {
      const slot = slots[i]
      const slotContainer = this.hotbarSlots[i]
      if (!slotContainer) continue

      const icon = slotContainer.getAt(2) as Phaser.GameObjects.Image
      const quantityText = slotContainer.getAt(3) as Phaser.GameObjects.Text

      if (slot?.item) {
        icon.setTexture(slot.item.icon).setVisible(true)
        quantityText.setText(slot.quantity.toString()).setVisible(slot.quantity > 1)
      } else {
        icon.setVisible(false)
        quantityText.setVisible(false)
      }
    }
  }

  toggle() {
    this.isOpen = !this.isOpen
    this.container.setVisible(this.isOpen)
    this.refreshUI()

    if (!this.isOpen && this.dragSprite) {
      this.endDrag()
    }
  }

  update() {
    // Update drag sprite position
    if (this.dragSprite) {
      this.dragSprite.setPosition(this.scene.input.x, this.scene.input.y)
    }
  }

  getSelectedHotbarItem(): InventorySlot | null {
    return this.inventory.getItem(this.selectedHotbarIndex)
  }
}