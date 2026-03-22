import * as Phaser from "phaser"
import {
    SPIDER_MAX_HP, SPIDER_SPEED,
    BRUTE_MAX_HP, BRUTE_SPEED,
    GHOST_MAX_HP, GHOST_SPEED
} from "../config/constants"

export type MonsterType = "spider" | "ghost" | "brute"

export class Monster {
    public sprite: Phaser.Physics.Arcade.Sprite
    public hp: number
    public type: MonsterType
    private speed: number
    private isDead: boolean = false
    private scene: Phaser.Scene
    private maxHp: number
    private hpBar: Phaser.GameObjects.Graphics
    private isKnockedBack: boolean = false

    constructor(scene: Phaser.Scene, x: number, y: number, type: MonsterType) {
        this.scene = scene
        this.type = type

        // Set type-specific stats
        let maxHp = SPIDER_MAX_HP
        this.speed = SPIDER_SPEED
        let texture = "spider"

        if (type === "ghost") {
            maxHp = GHOST_MAX_HP
            this.speed = GHOST_SPEED
            texture = "ghost"
        } else if (type === "brute") {
            maxHp = BRUTE_MAX_HP
            this.speed = BRUTE_SPEED
            texture = "brute"
        }

        this.hp = maxHp
        this.maxHp = maxHp
        this.sprite = scene.physics.add.sprite(x, y, texture).setScale(3)
        this.sprite.setCollideWorldBounds(true)

        if (type === "ghost") {
            this.sprite.setAlpha(0.6) // Ghosts are semi-transparent
        } else if (type === "brute") {
            this.sprite.setTint(0xff0000)
            this.sprite.setScale(3.5)
        }

        this.hpBar = this.scene.add.graphics()
        this.drawHealthBar()
    }

    isActive(): boolean {
        return !this.isDead && this.sprite && this.sprite.active
    }

    getDamage(): number {
        switch (this.type) {
            case "brute": return 4
            case "ghost": return 2
            case "spider": return 1
            default: return 1
        }
    }

    applyKnockback(force: number, sourceX: number, sourceY: number) {
        if (!this.isActive() || !this.sprite.body) return

        this.isKnockedBack = true
        const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.sprite.x, this.sprite.y)
        const body = this.sprite.body as Phaser.Physics.Arcade.Body

        body.setDrag(800) // High drag to bleed off knockback
        body.setVelocity(
            Math.cos(angle) * force,
            Math.sin(angle) * force
        )
    }

    update(playerSprite: Phaser.Physics.Arcade.Sprite) {
        if (!this.isActive() || !this.sprite.body) return
        const body = this.sprite.body as Phaser.Physics.Arcade.Body

        // Handle knockback state
        if (this.isKnockedBack) {
            if (body.speed < 20) {
                this.isKnockedBack = false
                body.setDrag(0)
            } else {
                this.drawHealthBar()
                return // Skip AI while knocked back
            }
        }

        // Basic AI: move towards the player
        const player = playerSprite
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.x, player.y)

        body.setVelocityX(Math.cos(angle) * this.speed)
        body.setVelocityY(Math.sin(angle) * this.speed)

        // Flip sprite based on direction
        if (body.velocity.x > 0) {
            this.sprite.setFlipX(false)
        } else if (body.velocity.x < 0) {
            this.sprite.setFlipX(true)
        }

        this.drawHealthBar()
    }

    private drawHealthBar() {
        if (!this.hpBar || !this.sprite) return
        this.hpBar.clear()
        if (!this.isActive()) return

        const w = 40, h = 6
        const x = this.sprite.x - w / 2
        const y = this.sprite.y - 45

        // Background
        this.hpBar.fillStyle(0x000000, 0.5)
        this.hpBar.fillRect(x, y, w, h)

        // Health
        const healthPercent = Math.max(0, this.hp / this.maxHp)
        const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.25 ? 0xffff00 : 0xff0000)
        this.hpBar.fillStyle(color, 1)
        this.hpBar.fillRect(x + 1, y + 1, (w - 2) * healthPercent, h - 2)

        this.hpBar.setDepth(this.sprite.depth + 1)
    }

    damage(amount: number, scene: Phaser.Scene): boolean {
        if (this.isDead) return false

        this.hp -= amount

        // Flash effect
        scene.tweens.add({
            targets: this.sprite,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 1
        })

        this.drawHealthBar()

        if (this.hp <= 0) {
            this.die(scene)
            return true
        }
        return false
    }

    private die(scene: Phaser.Scene) {
        this.isDead = true
        if (this.sprite.body) {
            this.sprite.setVelocity(0)
        }
        if (this.hpBar) {
            this.hpBar.clear()
        }

        // Death animation
        scene.tweens.add({
            targets: this.sprite,
            angle: 180,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.destroy()
            }
        })
    }

    destroy() {
        if (this.hpBar) {
            this.hpBar.destroy()
        }
        if (this.sprite) {
            this.sprite.destroy()
        }
    }
}
