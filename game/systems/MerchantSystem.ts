import * as Phaser from "phaser"
import { Merchant } from "../entities/Merchant"
import { MerchantUI } from "../ui/MerchantUI"
import { Player } from "../entities/Player"
import { MERCHANT_INTERACT_RADIUS, WOOD_TO_COIN_RATE, ITEM_PRICES } from "../config/constants"
import { ITEMS } from "../config/items"

export class MerchantSystem {
  private merchant: Merchant
  private merchantUI: MerchantUI
  private inventoryUI: any // Reference to refresh hotbar
  private isOpen = false

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, inventoryUI: any) {
    this.merchant = new Merchant(scene, x, y)
    this.merchantUI = new MerchantUI(scene, player, this)
    this.inventoryUI = inventoryUI
  }

  toggle(player: Player) {
    this.isOpen ? this.close() : this.open(player)
  }

  open(player: Player) {
    this.isOpen = true
    this.merchantUI.show(player)
  }

  close() {
    this.isOpen = false
    this.merchantUI.hide()
  }

  isPlayerInRange(playerX: number, playerY: number): boolean {
    const dx = playerX - this.merchant.sprite.x
    const dy = playerY - this.merchant.sprite.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < MERCHANT_INTERACT_RADIUS
  }

  sellWood(player: Player, amount: number): string {
    const requestedAmount = amount === -1 ? player.wood : amount
    const actualAmount = Math.min(requestedAmount, player.wood)

    if (actualAmount <= 0) {
      return "❌ No wood to sell!"
    }

    player.wood = Math.max(0, player.wood - actualAmount)
    player.inventory.removeItemById("wood", actualAmount)
    player.coins += actualAmount * WOOD_TO_COIN_RATE

    this.inventoryUI.refreshUI()
    return `✅ Sold ${actualAmount} wood → +${actualAmount * WOOD_TO_COIN_RATE} coins`
  }

  buyItem(player: Player, key: string): string {
    const price = ITEM_PRICES[key]

    if (player.coins < price) {
      return `❌ Need ${price} coins!`
    }

    player.coins -= price

    const itemId =
      key === "sword" ? "wooden-sword" :
        key === "bow" ? "basic-bow" :
          key === "pickaxe" ? "wooden-pickaxe" :
            key === "axe" ? "iron-axe" :
              null

    if (!itemId || !ITEMS[itemId]) {
      return "❌ Item not found!"
    }

    const added = player.inventory.addItem(ITEMS[itemId], 1)
    if (!added) {
      return "❌ Inventory full!"
    }

    this.inventoryUI.refreshUI()
    return `✅ Purchased ${ITEMS[itemId].name}!`
  }

  canAfford(player: Player, key: string): boolean {
    return player.coins >= ITEM_PRICES[key]
  }

  isOpenNow(): boolean {
    return this.isOpen
  }
}