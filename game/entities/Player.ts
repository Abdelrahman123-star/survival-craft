import * as Phaser from "phaser"
import { PLAYER_MAX_HP } from "../config/constants"
import { Inventory } from "./Inventory"
import { ITEMS } from "../config/items"

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite
  public weaponSprite: Phaser.GameObjects.Image
  public hp = PLAYER_MAX_HP

  public wood = 0
  public coins = 0
  public inventory = new Inventory(20)
  public lastAttackAt = 0
  public lastHitAt = 0
  public equippedItemId: string | null = null
  public isDead = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "player").setScale(3).setDepth(1)

    // Ensure clean state on respawn
    this.sprite.setAlpha(1)
    this.sprite.setAngle(0)
    this.isDead = false

    this.weaponSprite = scene.add.image(x + 18, y + 4, "sword")
      .setScale(2.1)
      .setDepth(2)
      .setVisible(false)
      .setOrigin(0.2, 0.8)

    // Start with a sword
    this.inventory.addItem(ITEMS["wooden-sword"], 1)
    this.moveItemToHotbar(0, "wooden-sword")
  }

  updateMovement(keys: Record<string, Phaser.Input.Keyboard.Key>, speed: number, merchantOpen: boolean) {
    if (merchantOpen) {
      this.sprite.setVelocity(0)
      return
    }

    this.sprite.setVelocity(0)
    if (keys.left?.isDown) this.sprite.setVelocityX(-speed)
    if (keys.right?.isDown) this.sprite.setVelocityX(speed)
    if (keys.up?.isDown) this.sprite.setVelocityY(-speed)
    if (keys.down?.isDown) this.sprite.setVelocityY(speed)
  }

  updateWeaponFollow() {
    if (!this.weaponSprite.visible) return
    const vx = this.sprite.body ? (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x : 0
    const facingRight = vx >= 0
    const xOff = facingRight ? 18 : -18
    this.weaponSprite.setPosition(this.sprite.x + xOff, this.sprite.y + 6)
    this.weaponSprite.setFlipX(!facingRight)
  }

  updateWeaponVisual() {
    const show = !!this.equippedItemId
    if (show && this.equippedItemId) {
      const icon = ITEMS[this.equippedItemId]?.icon ?? "sword"
      this.weaponSprite.setTexture(icon)
    }
    this.weaponSprite.setVisible(show)
    this.updateWeaponFollow()
  }

  setEquippedItem(itemId: string | null) {
    this.equippedItemId = itemId
    this.updateWeaponVisual()
  }

  playChoppingAnimation() {
    if (!this.weaponSprite.visible) return

    this.sprite.scene.tweens.killTweensOf(this.weaponSprite)
    this.weaponSprite.setRotation(0)

    this.sprite.scene.tweens.add({
      targets: this.weaponSprite,
      rotation: { from: -0.8, to: 0.8 },
      duration: 150,
      yoyo: true,
      ease: "Power2.easeInOut"
    })
  }

  playDeathAnimation(onComplete: () => void) {
    this.sprite.scene.tweens.killTweensOf(this.sprite)
    this.sprite.scene.tweens.killTweensOf(this.weaponSprite)

    this.weaponSprite.setVisible(false)
    this.sprite.setVelocity(0)

    this.sprite.scene.tweens.add({
      targets: this.sprite,
      angle: 90,
      alpha: 0,
      y: this.sprite.y + 20,
      duration: 500,
      ease: "Power2",
      onComplete: onComplete
    })
  }

  takeDamage(damage: number): boolean {
    if (this.isDead) return false
    this.hp = Math.max(0, this.hp - damage)
    if (this.hp <= 0) {
      this.isDead = true
      return true
    }
    return false
  }

  addWood(amount: number) {
    this.wood += amount
  }

  syncWoodToInventory() {
    const invWood = this.inventory.countItem("wood")
    const diff = this.wood - invWood
    if (diff > 0) {
      this.inventory.addItem(ITEMS["wood"], diff)
    } else if (diff < 0) {
      this.inventory.removeItemById("wood", Math.abs(diff))
    }
  }

  addCoins(amount: number) {
    this.coins += amount
  }

  canAttack(now: number, cooldown: number): boolean {
    return this.equippedItemId === "wooden-sword" && now - this.lastAttackAt >= cooldown
  }

  private moveItemToHotbar(hotbarIndex: number, itemId: string) {
    const slots = this.inventory.getAllSlots()
    const fromIndex = slots.findIndex(s => s.item?.id === itemId)
    if (fromIndex === -1) return
    this.inventory.swapSlots(fromIndex, hotbarIndex)
  }
}