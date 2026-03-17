import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { MerchantSystem } from "../systems/MerchantSystem"
import { SHOP_ITEMS, ITEM_PRICES, WOOD_TO_COIN_RATE } from "../config/constants"

export class MerchantUI {
  private container: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private player: Player
  private merchantSystem: MerchantSystem
  private statusText!: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, player: Player, merchantSystem: MerchantSystem) {
    this.scene = scene
    this.player = player
    this.merchantSystem = merchantSystem
    this.container = this.buildUI()
    this.container.setVisible(false)
  }

  private buildUI(): Phaser.GameObjects.Container {
    const PW = Math.min(560, Math.floor(this.scene.scale.width * 0.8))
    const PH = Math.min(480, Math.floor(this.scene.scale.height * 0.8))
    
    const ui = this.scene.add.container(this.scene.scale.width / 2, this.scene.scale.height / 2)
    ui.setScrollFactor(0).setDepth(50)

    // Backdrop
    const backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.45)
      .setInteractive()
    backdrop.on("pointerdown", () => this.merchantSystem.close())

    const panel = this.scene.add.rectangle(0, 0, PW, PH, 0x1a1a1a, 0.95)
    panel.setStrokeStyle(2, 0xffffff, 0.15)

    // Header
    const titleText = this.scene.add.text(-PW / 2 + 18, -PH / 2 + 14, "Merchant", {
      fontSize: "22px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold",
    })

    const coinsText = this.scene.add.text(PW / 2 - 18, -PH / 2 + 16, `🪙 ${this.player.coins}`, {
      fontSize: "16px", color: "#FFD700", fontFamily: "Arial", fontStyle: "bold",
    }).setOrigin(1, 0).setName("merchantCoinsDisplay")

    const woodText = this.scene.add.text(PW / 2 - 120, -PH / 2 + 16, `🪵 ${this.player.wood}`, {
      fontSize: "16px", color: "#bff0bf", fontFamily: "Arial", fontStyle: "bold",
    }).setOrigin(1, 0).setName("merchantWoodDisplay")

    // Sell section
    const sellLabel = this.scene.add.text(-PW / 2 + 18, -PH / 2 + 56, "SELL WOOD", {
      fontSize: "12px", color: "#cccccc", fontFamily: "Arial", fontStyle: "bold",
    })

    const rateNote = this.scene.add.text(PW / 2 - 18, -PH / 2 + 56, `1 wood = ${WOOD_TO_COIN_RATE} coins`, {
      fontSize: "12px", color: "#999999", fontFamily: "Arial",
    }).setOrigin(1, 0)

    const woodDisplay = this.scene.add.text(-PW / 2 + 18, -PH / 2 + 82, "🪵", { fontSize: "20px" })

    const woodCountDisplay = this.scene.add.text(-PW / 2 + 48, -PH / 2 + 86, `${this.player.wood} wood`, {
      fontSize: "14px", color: "#ffffff", fontFamily: "Arial",
    }).setName("woodCountDisplay").setOrigin(0, 0.5)

    // Sell buttons
    const sell1Btn = this.makeIconButton(PW / 2 - 170, -PH / 2 + 86, "Sell 1", 90, 30, 
      () => this.updateStatus(this.merchantSystem.sellWood(this.player, 1)), 0x333333)

    const sellAllBtn = this.makeIconButton(PW / 2 - 70, -PH / 2 + 86, "Sell All", 110, 30, 
      () => this.updateStatus(this.merchantSystem.sellWood(this.player, -1)), 0x333333)

    // Buy section
    const buyLabel = this.scene.add.text(-PW / 2 + 18, -PH / 2 + 130, "BUY ITEMS", {
      fontSize: "12px", color: "#cccccc", fontFamily: "Arial", fontStyle: "bold",
    })

    // Item cards
    const itemCards: Phaser.GameObjects.GameObject[] = []
    SHOP_ITEMS.forEach((item, i) => {
      const cardY = -PH / 2 + 170 + i * 56
      const cards = this.makeItemCard(0, cardY, item.key, item.label, item.desc)
      itemCards.push(...cards)
    })

    // Status message
    this.statusText = this.scene.add.text(-PW / 2 + 18, PH / 2 - 72, "", {
      fontSize: "13px", color: "#FFD700", fontFamily: "Arial",
    }).setOrigin(0, 0.5).setName("statusMsg")

    const closeBtn = this.makeIconButton(PW / 2 - 70, PH / 2 - 42, "Close", 110, 30, 
      () => this.merchantSystem.close(), 0x333333)

    ui.add([
      backdrop, panel, titleText, woodText, coinsText,
      sellLabel, rateNote, woodDisplay, woodCountDisplay,
      sell1Btn, sellAllBtn, buyLabel, ...itemCards,
      this.statusText, closeBtn,
    ])

    return ui
  }

  private makeItemCard(
    x: number, y: number,
    key: string, label: string, desc: string
  ): Phaser.GameObjects.GameObject[] {
    const W = Math.min(520, Math.floor(this.scene.scale.width * 0.74))
    const price = ITEM_PRICES[key]
    const canAfford = this.merchantSystem.canAfford(this.player, key)

    const card = this.scene.add.rectangle(x, y, W, 44, canAfford ? 0x2a1a4a : 0x1a1a1a, 0.8)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setName(`itemCard_${key}`)

    const itemImg = this.scene.add.image(x - W / 2 + 26, y, key).setScale(2.1).setName(`itemImg_${key}`)

    const nameText = this.scene.add.text(x - W / 2 + 50, y, label, {
      fontSize: "14px", color: "#ffffff", fontFamily: "Arial",
    }).setOrigin(0, 0.5)

    const priceText = this.scene.add.text(x + W / 2 - 170, y, `🪙 ${price}`, {
      fontSize: "14px", color: canAfford ? "#FFD700" : "#666666", fontFamily: "Arial", fontStyle: "bold",
    }).setOrigin(0, 0.5).setName(`itemPrice_${key}`)

    const ownedCount = this.player.inventory[key] ?? 0
    const ownedText = this.scene.add.text(x + W / 2 - 84, y, ownedCount > 0 ? `Owned: ${ownedCount}` : "", {
      fontSize: "12px", color: "#aaaaaa", fontFamily: "Arial",
    }).setOrigin(1, 0.5).setName(`itemOwned_${key}`)

    const buyBtn = this.makeIconButton(x + W / 2 - 34, y, "Buy", 68, 28, 
      () => this.updateStatus(this.merchantSystem.buyItem(this.player, key)), 0x333333)

    // desc parameter is used for tooltip or future expansion
    if (desc) {
      // Could add tooltip functionality here
    }

    return [card, itemImg, nameText, priceText, ownedText, buyBtn]
  }

  private makeIconButton(
    x: number, y: number,
    label: string,
    width: number, height: number,
    onClick: () => void,
    bgColor = 0x2a1a5a
  ): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: "13px", color: "#e8dcc8", fontFamily: "Georgia", fontStyle: "bold",
      backgroundColor: "#" + bgColor.toString(16).padStart(6, "0"),
      padding: { x: 10, y: 6 },
      fixedWidth: width, fixedHeight: height, align: "center",
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })

    btn.on("pointerover",  () => { btn.setStyle({ color: "#FFD79A" }); btn.setAlpha(0.95); btn.setScale(1.03) })
    btn.on("pointerout",   () => { btn.setStyle({ color: "#e8dcc8" }); btn.setAlpha(1); btn.setScale(1) })
    btn.on("pointerdown",  () => { btn.setAlpha(0.85); onClick() })
    return btn
  }

  private updateStatus(message: string) {
    this.statusText.setText(message)
  }

  show(player: Player) {
    this.player = player
    this.refresh()
    this.container.setVisible(true)
  }

  hide() {
    this.container.setVisible(false)
  }

  refresh() {
    // Update all displays
    const woodCount = this.container.getByName("woodCountDisplay") as Phaser.GameObjects.Text
    woodCount?.setText(`${this.player.wood} wood`)

    const coinsDisplay = this.container.getByName("merchantCoinsDisplay") as Phaser.GameObjects.Text
    coinsDisplay?.setText(`🪙 ${this.player.coins}`)

    const woodDisplay = this.container.getByName("merchantWoodDisplay") as Phaser.GameObjects.Text
    woodDisplay?.setText(`🪵 ${this.player.wood}`)

    // Update item cards
    SHOP_ITEMS.forEach(({ key }) => {
      const owned = this.container.getByName(`itemOwned_${key}`) as Phaser.GameObjects.Text
      const count = this.player.inventory[key] ?? 0
      owned?.setText(count > 0 ? `Owned: ${count}` : "")

      const card = this.container.getByName(`itemCard_${key}`) as Phaser.GameObjects.Rectangle
      const priceText = this.container.getByName(`itemPrice_${key}`) as Phaser.GameObjects.Text
      if (card && priceText) {
        const canAfford = this.merchantSystem.canAfford(this.player, key)
        card.setFillStyle(canAfford ? 0x2a1a4a : 0x1a1a1a)
        priceText.setColor(canAfford ? "#FFD700" : "#666666")
      }
    })
  }
}