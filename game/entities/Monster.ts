import * as Phaser from "phaser"
import {
    SPIDER_MAX_HP, SPIDER_SPEED, SPIDER_ATTACK_RANGE, SPIDER_WINDUP_MS, SPIDER_ATTACK_COOLDOWN,
    BRUTE_MAX_HP, BRUTE_SPEED, BRUTE_ATTACK_RANGE, BRUTE_WINDUP_MS, BRUTE_ATTACK_COOLDOWN,
    GHOST_MAX_HP, GHOST_SPEED, GHOST_ATTACK_RANGE, GHOST_WINDUP_MS, GHOST_ATTACK_COOLDOWN
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
    private isAttacking: boolean = false
    private lastAttackTime: number = 0
    private attackStartTime: number = 0
    private attackWarningGraphics: Phaser.GameObjects.Graphics
    private attackConfig: { range: number, windup: number, cooldown: number }

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
            this.attackConfig = { range: GHOST_ATTACK_RANGE, windup: GHOST_WINDUP_MS, cooldown: GHOST_ATTACK_COOLDOWN }
        } else if (type === "brute") {
            maxHp = BRUTE_MAX_HP
            this.speed = BRUTE_SPEED
            texture = "brute"
            this.attackConfig = { range: BRUTE_ATTACK_RANGE, windup: BRUTE_WINDUP_MS, cooldown: BRUTE_ATTACK_COOLDOWN }
        } else {
            this.attackConfig = { range: SPIDER_ATTACK_RANGE, windup: SPIDER_WINDUP_MS, cooldown: SPIDER_ATTACK_COOLDOWN }
        }

        this.hp = maxHp
        this.maxHp = maxHp
        this.sprite = scene.physics.add.sprite(x, y, texture).setScale(3).setDepth(5)
        this.sprite.setCollideWorldBounds(true)

        if (type === "ghost") {
            this.sprite.setAlpha(0.6) // Ghosts are semi-transparent
        } else if (type === "brute") {
            this.sprite.setTint(0xff0000)
            this.sprite.setScale(3.5)
        }

        this.hpBar = this.scene.add.graphics()
        this.attackWarningGraphics = this.scene.add.graphics()
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

    update(playerSprite: Phaser.Physics.Arcade.Sprite, onAttack?: (damage: number) => void) {
        if (!this.isActive() || !this.sprite.body) return
        const body = this.sprite.body as Phaser.Physics.Arcade.Body

        // Handle knockback state
        if (this.isKnockedBack) {
            if (this.isAttacking) this.cancelAttack()
            if (body.speed < 20) {
                this.isKnockedBack = false
                body.setDrag(0)
            } else {
                this.drawHealthBar()
                return // Skip AI while knocked back
            }
        }

        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
        const now = this.scene.time.now

        if (this.isAttacking) {
            const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
            const slowSpeed = this.speed * 0.2
            body.setVelocityX(Math.cos(angle) * slowSpeed)
            body.setVelocityY(Math.sin(angle) * slowSpeed)

            this.drawAttackWarning()
            this.drawHealthBar()
            return
        }

        // Basic AI: move towards the player
        if (dist < this.attackConfig.range && now - this.lastAttackTime > this.attackConfig.cooldown) {
            this.startAttack(playerSprite, onAttack)
        } else {
            const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
            body.setVelocityX(Math.cos(angle) * this.speed)
            body.setVelocityY(Math.sin(angle) * this.speed)

            // Flip sprite based on direction
            if (body.velocity.x > 0) {
                this.sprite.setFlipX(false)
            } else if (body.velocity.x < 0) {
                this.sprite.setFlipX(true)
            }
        }

        this.drawHealthBar()
    }

    private startAttack(playerSprite: Phaser.Physics.Arcade.Sprite, onAttack?: (damage: number) => void) {
        this.isAttacking = true
        this.attackStartTime = this.scene.time.now
        this.scene.time.delayedCall(this.attackConfig.windup, () => {
            if (this.isActive() && this.isAttacking) {
                this.executeAttack(playerSprite, onAttack)
            }
        })
    }

    private executeAttack(playerSprite: Phaser.Physics.Arcade.Sprite, onAttack?: (damage: number) => void) {
        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y)
        if (dist <= this.attackConfig.range && onAttack) {
            onAttack(this.getDamage())
        }
        this.isAttacking = false
        this.lastAttackTime = this.scene.time.now
        if (this.attackWarningGraphics) this.attackWarningGraphics.clear()
    }

    private cancelAttack() {
        this.isAttacking = false
        if (this.attackWarningGraphics) this.attackWarningGraphics.clear()
    }

    private drawAttackWarning() {
        if (!this.attackWarningGraphics) return
        this.attackWarningGraphics.clear()

        const elapsed = this.scene.time.now - this.attackStartTime
        const progress = Math.min(elapsed / this.attackConfig.windup, 1)

        // Outer ring — shows full attack range
        this.attackWarningGraphics.lineStyle(2, 0xff0000, 0.6)
        this.attackWarningGraphics.strokeCircle(this.sprite.x, this.sprite.y, this.attackConfig.range)

        // Inner charging fill — grows from center outward
        this.attackWarningGraphics.fillStyle(0xff0000, 0.1 + progress * 0.35)
        this.attackWarningGraphics.fillCircle(this.sprite.x, this.sprite.y, this.attackConfig.range * progress)

        // Charging ring edge — a brighter ring at the edge of the fill
        if (progress < 1) {
            this.attackWarningGraphics.lineStyle(3, 0xff4444, 0.9)
            this.attackWarningGraphics.strokeCircle(this.sprite.x, this.sprite.y, this.attackConfig.range * progress)
        }

        this.attackWarningGraphics.setDepth(4)
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
        if (this.attackWarningGraphics) {
            this.attackWarningGraphics.destroy()
        }
    }
}
