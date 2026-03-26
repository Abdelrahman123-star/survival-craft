import { BOSS_ATTACK_RANGE, BOSS_WINDUP_MS, BOSS_ATTACK_COOLDOWN } from "../config/constants"

export class BossMonster {
  public sprite: Phaser.Physics.Arcade.Sprite
  public hp: number
  private readonly maxHp: number
  private readonly speed: number
  private readonly damageAmount: number
  private readonly scene: Phaser.Scene
  private hpBar: Phaser.GameObjects.Graphics
  private isDead = false
  private isKnockedBack = false
  public onAttackHit?: (damage: number) => void
  private lastAttackTime = 0
  private attackStartTime = 0
  private isAttacking = false
  private attackWarningGraphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.maxHp = 200
    this.hp = this.maxHp
    this.speed = 92
    this.damageAmount = 12

    this.sprite = scene.physics.add.sprite(x, y, "boss").setScale(6.5).setDepth(6)
    this.sprite.setTint(0x9f5cff)
    this.sprite.setCollideWorldBounds(true)

    this.hpBar = scene.add.graphics()
    this.attackWarningGraphics = scene.add.graphics()
    this.drawHealthBar()
  }

  isActive(): boolean {
    return !this.isDead && this.sprite.active
  }

  getDamage(): number {
    return this.damageAmount
  }

  applyKnockback(force: number, sourceX: number, sourceY: number) {
    if (!this.isActive() || !this.sprite.body) return
    this.isKnockedBack = true

    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.sprite.x, this.sprite.y)
    body.setDrag(900)
    body.setVelocity(Math.cos(angle) * force * 0.55, Math.sin(angle) * force * 0.55)
  }

  update(playerSprite: Phaser.Physics.Arcade.Sprite) {
    if (!this.isActive() || !this.sprite.body) return
    const body = this.sprite.body as Phaser.Physics.Arcade.Body

    if (this.isKnockedBack) {
      if (body.speed < 20) {
        this.isKnockedBack = false
        body.setDrag(0)
      } else {
        this.drawHealthBar()
        return
      }
    }

    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
    const now = this.scene.time.now

    if (this.isAttacking) {
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
      const slowSpeed = this.speed * 0.15 // Even slower for the boss
      body.setVelocity(Math.cos(angle) * slowSpeed, Math.sin(angle) * slowSpeed)

      this.drawAttackWarning()
      this.drawHealthBar()
      return
    }

    if (dist < BOSS_ATTACK_RANGE && now - this.lastAttackTime > BOSS_ATTACK_COOLDOWN) {
      this.startAttack(playerSprite)
    } else {
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
      body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed)
      this.sprite.setFlipX(body.velocity.x < 0)
    }

    this.drawHealthBar()
  }

  private startAttack(playerSprite: Phaser.Physics.Arcade.Sprite) {
    this.isAttacking = true
    this.attackStartTime = this.scene.time.now
    this.scene.time.delayedCall(BOSS_WINDUP_MS, () => {
      if (this.isActive() && this.isAttacking) {
        this.executeAttack(playerSprite)
      }
    })
  }

  private executeAttack(playerSprite: Phaser.Physics.Arcade.Sprite) {
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
    if (dist <= BOSS_ATTACK_RANGE && this.onAttackHit) {
      this.onAttackHit(this.damageAmount)
    }
    this.isAttacking = false
    this.lastAttackTime = this.scene.time.now
    if (this.attackWarningGraphics) this.attackWarningGraphics.clear()
  }

  private drawAttackWarning() {
    if (!this.attackWarningGraphics) return
    this.attackWarningGraphics.clear()

    const elapsed = this.scene.time.now - this.attackStartTime
    const progress = Math.min(elapsed / BOSS_WINDUP_MS, 1)

    // Outer ring — shows full attack range
    this.attackWarningGraphics.lineStyle(3, 0xff0000, 0.6)
    this.attackWarningGraphics.strokeCircle(this.sprite.x, this.sprite.y, BOSS_ATTACK_RANGE)

    // Inner charging fill — grows from center outward
    this.attackWarningGraphics.fillStyle(0xff0000, 0.12 + progress * 0.4)
    this.attackWarningGraphics.fillCircle(this.sprite.x, this.sprite.y, BOSS_ATTACK_RANGE * progress)

    // Charging ring edge
    if (progress < 1) {
      this.attackWarningGraphics.lineStyle(4, 0xff4444, 0.9)
      this.attackWarningGraphics.strokeCircle(this.sprite.x, this.sprite.y, BOSS_ATTACK_RANGE * progress)
    }

    this.attackWarningGraphics.setDepth(5)
  }

  takeDamage(amount: number): boolean {
    if (!this.isActive()) return false

    this.hp -= amount
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.35,
      duration: 65,
      yoyo: true,
      repeat: 1,
    })

    this.drawHealthBar()
    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  private drawHealthBar() {
    this.hpBar.clear()
    if (!this.isActive()) return

    const w = 110
    const h = 10
    const x = this.sprite.x - w / 2
    const y = this.sprite.y - 90

    this.hpBar.fillStyle(0x000000, 0.6)
    this.hpBar.fillRect(x, y, w, h)

    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1)
    const color = ratio > 0.5 ? 0x22cc55 : ratio > 0.25 ? 0xe1b500 : 0xcc3344
    this.hpBar.fillStyle(color, 1)
    this.hpBar.fillRect(x + 1, y + 1, (w - 2) * ratio, h - 2)
  }

  private die() {
    this.isDead = true
    if (this.sprite.body) this.sprite.setVelocity(0)
    this.hpBar.clear()

    this.scene.tweens.add({
      targets: this.sprite,
      angle: 180,
      scale: 0,
      alpha: 0,
      duration: 450,
      onComplete: () => this.destroy(),
    })
  }

  destroy() {
    this.hpBar.destroy()
    this.attackWarningGraphics.destroy()
    this.sprite.destroy()
  }
}
