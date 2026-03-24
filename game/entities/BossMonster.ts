import * as Phaser from "phaser"

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.maxHp = 200
    this.hp = this.maxHp
    this.speed = 92
    this.damageAmount = 12

    this.sprite = scene.physics.add.sprite(x, y, "boss").setScale(6.5).setDepth(2)
    this.sprite.setTint(0x9f5cff)
    this.sprite.setCollideWorldBounds(true)

    this.hpBar = scene.add.graphics()
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

    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
    body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed)
    this.sprite.setFlipX(body.velocity.x < 0)
    this.drawHealthBar()
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
    this.sprite.destroy()
  }
}
