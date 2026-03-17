import * as Phaser from "phaser"
import { SPIDER_SPEED, SPIDER_MAX_HP, BRUTE_SPEED, BRUTE_MAX_HP, GHOST_SPEED, GHOST_MAX_HP } from "../config/constants"

export type MonsterType = "spider" | "brute" | "ghost"

export class Monster {
  public sprite: Phaser.Physics.Arcade.Sprite
  private hpBarBg: Phaser.GameObjects.Rectangle
  private hpBarFill: Phaser.GameObjects.Rectangle
  private maxHp: number
  private kind: MonsterType
  private speed: number
  private dmgMin: number
  private dmgMax: number
  private isAlive: boolean = true

  constructor(scene: Phaser.Scene, x: number, y: number, type: MonsterType = "spider") {
    this.kind = type
    this.sprite = scene.physics.add.sprite(x, y, "monster")
      .setScale(3)
      .setDepth(1)
      .setCollideWorldBounds(true)

    // Set monster stats based on type
    if (type === "spider") {
      this.sprite.setTint(0xffffff)
      this.maxHp = SPIDER_MAX_HP
      this.speed = SPIDER_SPEED
      this.dmgMin = 0.5
      this.dmgMax = 0.5
    } else if (type === "ghost") {
      this.sprite.setTexture("ghost") // Specific asset for ghost
      this.sprite.setTint(0xaaaaff) // Bluish tint
      this.maxHp = GHOST_MAX_HP
      this.speed = GHOST_SPEED
      this.dmgMin = 0.7
      this.dmgMax = 0.8
    } else {
      this.sprite.setTint(0xff7777)
      this.maxHp = BRUTE_MAX_HP
      this.speed = BRUTE_SPEED
      this.dmgMin = 1.0
      this.dmgMax = 1.5
    }

    // Initialize data manager
    this.sprite.setDataEnabled()
    this.sprite.data.set("kind", type)
    this.sprite.data.set("speed", this.speed)
    this.sprite.data.set("hp", this.maxHp)
    this.sprite.data.set("maxHp", this.maxHp)
    this.sprite.data.set("dmgMin", this.dmgMin)
    this.sprite.data.set("dmgMax", this.dmgMax)

    // Create health bar
    const barW = 34
    const barH = 6
    this.hpBarBg = scene.add.rectangle(x, y - 26, barW, barH, 0x000000, 0.55).setDepth(2)
    this.hpBarFill = scene.add.rectangle(x - barW / 2 + 1, y - 26, barW - 2, barH - 2, 0x22cc55, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(2)
  }

  update(player: Phaser.Physics.Arcade.Sprite) {
    if (!this.isAlive || !this.sprite || !this.sprite.active || !this.sprite.body) {
      return
    }

    const angle = Math.atan2(player.y - this.sprite.y, player.x - this.sprite.x)
    this.sprite.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed)

    // Update health bar position
    const hp = this.sprite.data?.get("hp") as number ?? this.maxHp
    const ratio = Phaser.Math.Clamp(hp / this.maxHp, 0, 1)
    const barW = 34

    if (this.hpBarBg && this.hpBarFill) {
      this.hpBarBg.setPosition(this.sprite.x, this.sprite.y - 26)
      this.hpBarFill.setPosition(this.sprite.x - barW / 2 + 1, this.sprite.y - 26)
      this.hpBarFill.width = Math.max(0, Math.floor((barW - 2) * ratio))
    }
  }

  damage(amount: number, scene: Phaser.Scene): boolean {
    if (!this.isAlive || !this.sprite || !this.sprite.active) return false

    const currentHp = this.sprite.data?.get("hp") as number ?? this.maxHp
    const newHp = currentHp - amount
    this.sprite.data?.set("hp", newHp)

    // Hit flash
    this.sprite.setAlpha(0.6)
    scene.time.delayedCall(80, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.setAlpha(1)
      }
    })

    if (newHp <= 0) {
      this.destroy()
      return true // Monster died
    }
    return false // Monster still alive
  }

  destroy() {
    this.isAlive = false

    // Clean up health bar
    if (this.hpBarBg) {
      this.hpBarBg.destroy()
    }
    if (this.hpBarFill) {
      this.hpBarFill.destroy()
    }

    // Disable physics body first to prevent further collisions
    if (this.sprite && this.sprite.body) {
      (this.sprite.body as Phaser.Physics.Arcade.Body).enable = false
    }

    // Destroy the sprite
    if (this.sprite) {
      this.sprite.destroy()
    }
  }

  getDamage(): number {
    return this.dmgMin === this.dmgMax ? this.dmgMin : Phaser.Math.FloatBetween(this.dmgMin, this.dmgMax)
  }

  isActive(): boolean {
    // Explicitly return a boolean value, not boolean | null
    if (!this.isAlive) return false
    if (!this.sprite) return false
    if (!this.sprite.active) return false
    if (!this.sprite.body) return false

    // Check if body is enabled - cast to Arcade.Body to access enable property
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    return body.enable === true
  }
}