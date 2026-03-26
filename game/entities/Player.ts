import * as Phaser from "phaser"
import { IDLE_ANIM_FRAME_RATE, PLAYER_MAX_HP } from "../config/constants"
import { Inventory } from "./Inventory"
import { ITEMS } from "../config/items"
// Change this value to control idle animation speed (frames per second)

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite
  public weaponSprite: Phaser.GameObjects.Image
  public hp = PLAYER_MAX_HP
  public maxHp = PLAYER_MAX_HP
  public level = 1
  public xp = 0
  public xpToNextLevel = 100
  public inventory = new Inventory(20)
  public lastAttackAt = 0
  public lastHitAt = 0
  public equippedItemId: string | null = null
  public isDead = false
  public facingDirection = new Phaser.Math.Vector2(1, 0)
  private movementEnabled = true
  private currentDirection = "down"

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "player", 0).setScale(3).setDepth(1)
    this.sprite.setAlpha(1).setAngle(0)
    this.isDead = false

    // Create walk animations from the 4x4 sprite sheet
    // Row 1 (frames 0-3): walking down (toward camera, S key)
    // Row 2 (frames 4-7): walking up (away, W key)
    // Row 3 (frames 8-11): walking left (A key)
    // Row 4 (frames 12-15): walking right (D key)
    const directions = [
      { key: "player-walk-down", start: 0, end: 3 },
      { key: "player-walk-up", start: 4, end: 7 },
      { key: "player-walk-left", start: 8, end: 11 },
      { key: "player-walk-right", start: 12, end: 15 },
    ]
    directions.forEach((dir) => {
      if (!scene.anims.exists(dir.key)) {
        scene.anims.create({
          key: dir.key,
          frames: scene.anims.generateFrameNumbers("player", { start: dir.start, end: dir.end }),
          frameRate: 8,
          repeat: -1,
        })
      }
    })

    // Create idle animations using the first 2 frames of each direction row
    const idleDirections = [
      { key: "player-idle-down", start: 0, end: 1 },
      { key: "player-idle-up", start: 4, end: 5 },
      { key: "player-idle-left", start: 8, end: 9 },
      { key: "player-idle-right", start: 12, end: 13 },
    ]
    idleDirections.forEach((dir) => {
      if (!scene.anims.exists(dir.key)) {
        scene.anims.create({
          key: dir.key,
          frames: scene.anims.generateFrameNumbers("player", { start: dir.start, end: dir.end }),
          frameRate: IDLE_ANIM_FRAME_RATE,
          repeat: -1,
        })
      }
    })

    this.weaponSprite = scene.add.image(x + 18, y + 4, "wood-sword")
      .setScale(2.1).setDepth(2).setVisible(false).setOrigin(0.2, 0.8)

    // Ensure snappy movement and correct body size
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      // The sprite frame is 48x48 but the character is ~16x16 in the center
      body.setSize(16, 16)
      body.setOffset((48 - 16) / 2, (48 - 16) / 2)
      body.setDamping(false)
      body.setDrag(0)
      body.setMaxSpeed(400)
    }

    // Start with a sword and a hammer
    this.inventory.addItem(ITEMS["wooden-sword"], 1)
    this.inventory.addItem(ITEMS["hammer"], 1)
  }

  setMovementEnabled(enabled: boolean) {
    this.movementEnabled = enabled
    if (!enabled && this.sprite.body) this.sprite.setVelocity(0, 0)
  }

  updateMovement(keys: Record<string, Phaser.Input.Keyboard.Key>, speed: number) {
    if (!this.movementEnabled) {
      this.sprite.setVelocity(0)
      this.sprite.anims.stop()
      return
    }
    this.sprite.setVelocity(0)
    let moving = false

    if (keys.left?.isDown) { this.sprite.setVelocityX(-speed); this.currentDirection = "left"; moving = true }
    if (keys.right?.isDown) { this.sprite.setVelocityX(speed); this.currentDirection = "right"; moving = true }
    if (keys.up?.isDown) { this.sprite.setVelocityY(-speed); this.currentDirection = "up"; moving = true }
    if (keys.down?.isDown) { this.sprite.setVelocityY(speed); this.currentDirection = "down"; moving = true }

    if (moving) {
      const animKey = `player-walk-${this.currentDirection}`
      if (this.sprite.anims.currentAnim?.key !== animKey) {
        this.sprite.anims.play(animKey, true)
      }
    } else {
      // Play idle animation (first 2 frames of each direction) instead of a static frame
      const idleKey = `player-idle-${this.currentDirection}`
      if (this.sprite.anims.currentAnim?.key !== idleKey) {
        this.sprite.anims.play(idleKey, true)
      }
    }

    // Update facing direction based on velocity
    const velocity = this.sprite.body ? (this.sprite.body as Phaser.Physics.Arcade.Body).velocity : { x: 0, y: 0 }
    if (velocity.x !== 0 || velocity.y !== 0) {
      this.facingDirection.set(velocity.x, velocity.y).normalize()
    }
  }

  updateWeaponFollow() {
    if (!this.weaponSprite.visible) return
    const vx = this.sprite.body ? (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x : 0
    const facingRight = vx >= 0
    this.weaponSprite.setPosition(this.sprite.x + (facingRight ? 18 : -18), this.sprite.y + 6)
    this.weaponSprite.setFlipX(!facingRight)
  }

  updateWeaponVisual() {
    const show = !!this.equippedItemId
    if (show && this.equippedItemId) {
      this.weaponSprite.setTexture(ITEMS[this.equippedItemId]?.icon ?? "wood-sword")
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
      duration: 150, yoyo: true, ease: "Power2.easeInOut"
    })
  }

  playDeathAnimation(onComplete: () => void) {
    this.sprite.scene.tweens.killTweensOf(this.sprite)
    this.weaponSprite.setVisible(false)
    this.sprite.setVelocity(0)
    this.sprite.scene.tweens.add({
      targets: this.sprite, angle: 90, alpha: 0, y: this.sprite.y + 20,
      duration: 500, ease: "Power2", onComplete: onComplete
    })
  }

  takeDamage(damage: number): boolean {
    if (this.isDead) return false
    this.hp = Math.max(0, this.hp - damage)
    if (this.hp <= 0) { this.isDead = true; return true }
    return false
  }

  canAttack(now: number, cooldown: number): boolean {
    const item = this.equippedItemId ? ITEMS[this.equippedItemId] : null
    const isWeapon = item?.type === "weapon"
    return isWeapon && now - this.lastAttackAt >= cooldown
  }

  addXp(amount: number) {
    this.xp += amount
    while (this.xp >= this.xpToNextLevel) {
      this.levelUp()
    }
  }

  private levelUp() {
    this.xp -= this.xpToNextLevel
    this.level++
    this.xpToNextLevel = Math.floor(this.level * 100 * (1 + (this.level - 1) * 0.2))
    this.maxHp += 20
    this.hp = this.maxHp

    // Show level up effect
    this.showLevelUpEffect()
  }

  private showLevelUpEffect() {
    const scene = this.sprite.scene
    const text = scene.add.text(this.sprite.x, this.sprite.y - 60, "LEVEL UP!", {
      fontSize: "32px",
      color: "#FFD700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(20)

    scene.tweens.add({
      targets: text,
      y: this.sprite.y - 120,
      alpha: 0,
      duration: 2000,
      ease: "Power2",
      onComplete: () => text.destroy()
    })

    // Add some sparkle
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const sparkle = scene.add.circle(this.sprite.x, this.sprite.y, 5, 0xFFD700, 0.8).setDepth(19)
      scene.tweens.add({
        targets: sparkle,
        x: this.sprite.x + Math.cos(angle) * 100,
        y: this.sprite.y + Math.sin(angle) * 100,
        alpha: 0,
        duration: 1000,
        onComplete: () => sparkle.destroy()
      })
    }
  }
}