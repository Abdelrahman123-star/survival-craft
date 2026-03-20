import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { MerchantSystem } from "../systems/MerchantSystem"
import { SHOP_ITEMS, ITEM_PRICES } from "../config/constants"

export class MerchantUI {
  private container: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  private player: Player
  private merchantSystem: MerchantSystem
  private statusText!: Phaser.GameObjects.Text
  private backdrop!: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, player: Player, merchantSystem: MerchantSystem) {
    this.scene = scene; this.player = player; this.merchantSystem = merchantSystem
    this.container = this.buildUI(); this.container.setVisible(false)
  }

  private buildUI(): Phaser.GameObjects.Container {
    const PW = 500, PH = 400
    this.backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0, 0.5).setInteractive().on("pointerdown", () => this.merchantSystem.close())
    this.backdrop.setVisible(false).setDepth(209)

    const ui = this.scene.add.container(0, 0).setDepth(210)
    const panel = this.scene.add.rectangle(0, 0, PW, PH, 0x1a1a1a, 0.95).setStrokeStyle(2, 0xffffff, 0.15)
    const title = this.scene.add.text(-230, -180, "Merchant", { fontSize: "22px", color: "#fff", fontStyle: "bold" })
    const coins = this.scene.add.text(230, -180, "", { fontSize: "16px", color: "#FFD700", fontStyle: "bold" }).setOrigin(1, 0).setName("merchantCoinsDisplay")
    const wood = this.scene.add.text(120, -180, "", { fontSize: "16px", color: "#bff0bf", fontStyle: "bold" }).setOrigin(1, 0).setName("merchantWoodDisplay")
    ui.add([panel, title, coins, wood])

    const sellBtn = this.makeBtn(0, -100, "Sell All Wood", () => this.updateStatus(this.merchantSystem.sellWood(this.player, -1)))
    ui.add(sellBtn)

    SHOP_ITEMS.forEach((item, i) => {
      const y = -40 + i * 50
      ui.add(this.makeItemRow(y, item.key, item.label))
    })

    this.statusText = this.scene.add.text(-230, 160, "", { fontSize: "14px", color: "#FFD700" }).setOrigin(0).setName("statusMsg")
    ui.add(this.statusText)
    return ui
  }

  private makeItemRow(y: number, key: string, label: string) {
    const row = this.scene.add.container(0, y)
    const price = ITEM_PRICES[key]
    const txt = this.scene.add.text(-230, 0, `${label} (🪙 ${price})`, { fontSize: "16px", color: "#fff" }).setOrigin(0, 0.5)
    const buy = this.makeBtn(180, 0, "Buy", () => this.updateStatus(this.merchantSystem.buyItem(this.player, key)), 100)
    row.add([txt, buy])
    return row
  }

  private makeBtn(x: number, y: number, label: string, onClick: () => void, w: number = 200) {
    return this.scene.add.text(x, y, label, { fontSize: "14px", color: "#fff", backgroundColor: "#333", padding: { x: 10, y: 5 }, fixedWidth: w, align: "center" }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", onClick)
  }

  private updateStatus(m: string) { this.statusText.setText(m); this.refresh() }

  show(p: Player) { this.player = p; this.refresh(); this.updatePosition(); this.container.setVisible(true); this.backdrop.setVisible(true) }
  hide() { this.container.setVisible(false); this.backdrop.setVisible(false) }

  updatePosition() {
    const cam = this.scene.cameras.main
    this.container.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height / 2)
    this.backdrop.setPosition(cam.scrollX + this.scene.scale.width / 2, cam.scrollY + this.scene.scale.height / 2)
  }

  update() { if (this.container.visible) this.updatePosition() }

  refresh() {
    const coins = this.container.getByName("merchantCoinsDisplay") as Phaser.GameObjects.Text
    const wood = this.container.getByName("merchantWoodDisplay") as Phaser.GameObjects.Text
    if (coins) coins.setText(`🪙 ${this.player.inventory.getGold()}`)
    if (wood) wood.setText(`🪵 ${this.player.inventory.countItem("wood")}`)
  }
}