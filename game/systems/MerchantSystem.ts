import * as Phaser from "phaser"
import { Merchant } from "../entities/Merchant"
import { MerchantUI } from "../ui/MerchantUI"
import { Player } from "../entities/Player"
import { MERCHANT_INTERACT_RADIUS, WOOD_TO_COIN_RATE, ITEM_PRICES } from "../config/constants"
import { ITEMS } from "../config/items"

export class MerchantSystem {
  private merchant: Merchant
  private merchantUI: MerchantUI
  private inventoryUI: any
  private isOpen = false

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, inventoryUI: any) {
    this.merchant = new Merchant(scene, x, y)
    this.merchantUI = new MerchantUI(scene, player, this)
    this.inventoryUI = inventoryUI
  }

  toggle(player: Player) { this.isOpen ? this.close() : this.open(player) }
  open(player: Player) { this.isOpen = true; this.merchantUI.show(player) }
  close() { this.isOpen = false; this.merchantUI.hide() }

  update() { this.merchantUI.update() }

  isPlayerInRange(playerX: number, playerY: number): boolean {
    const dx = playerX - this.merchant.sprite.x, dy = playerY - this.merchant.sprite.y
    return Math.sqrt(dx * dx + dy * dy) < MERCHANT_INTERACT_RADIUS
  }

  sellWood(player: Player, amount: number): string {
    const invWood = player.inventory.countItem("wood")
    const actualAmount = amount === -1 ? invWood : Math.min(amount, invWood)
    if (actualAmount <= 0) return "❌ No wood to sell!"
    player.inventory.removeItemById("wood", actualAmount)
    player.inventory.addGold(actualAmount * WOOD_TO_COIN_RATE)
    this.inventoryUI.refreshUI()
    return `✅ Sold ${actualAmount} wood → +${actualAmount * WOOD_TO_COIN_RATE} coins`
  }

  buyItem(player: Player, key: string): string {
    const price = ITEM_PRICES[key]
    if (player.inventory.getGold() < price) return `❌ Need ${price} coins!`

    const itemId = key === "sword" ? "wooden-sword" : key === "bow" ? "basic-bow" : key === "pickaxe" ? "wooden-pickaxe" : key === "axe" ? "iron-axe" : null
    if (!itemId || !ITEMS[itemId]) return "❌ Item not found!"

    if (player.inventory.addItem(ITEMS[itemId], 1)) {
      player.inventory.removeGold(price)
      this.inventoryUI.refreshUI()
      return `✅ Purchased ${ITEMS[itemId].name}!`
    }
    return "❌ Inventory full!"
  }

  canAfford(player: Player, key: string): boolean {
    return player.inventory.getGold() >= ITEM_PRICES[key]
  }

  isOpenNow(): boolean { return this.isOpen }
}