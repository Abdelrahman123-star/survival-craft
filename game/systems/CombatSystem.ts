import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { MonsterSystem } from "./MonsterSystem"
import { PLAYER_ATTACK_RANGE, PLAYER_ATTACK_COOLDOWN_MS, PLAYER_HIT_COOLDOWN_MS } from "../config/constants"
import { InventorySlot } from "../entities/Inventory"

export class CombatSystem {
  private scene: Phaser.Scene
  private monsterSystem: MonsterSystem

  constructor(scene: Phaser.Scene, monsterSystem: MonsterSystem) {
    this.scene = scene
    this.monsterSystem = monsterSystem
  }

  handlePlayerAttack(
    player: Player,
    equipped: InventorySlot | null,
    now: number
  ): { hit: boolean, isCrit: boolean, damage: number, monstersHit: number } {
    const equippedWeaponOk = equipped?.item?.id === "wooden-sword"
    // player.equippedItemId is now managed via Player.setEquippedItem() from InventoryUI

    if (!equippedWeaponOk || !player.canAttack(now, PLAYER_ATTACK_COOLDOWN_MS)) {
      return { hit: false, isCrit: false, damage: 0, monstersHit: 0 }
    }

    player.lastAttackAt = now
    const isCrit = Math.random() < 0.1
    const damage = isCrit ? 2.5 : 10

    this.playSwordSwing(player, isCrit)

    const monstersInRange = this.monsterSystem.getMonstersInRange(
      player.sprite.x, player.sprite.y, PLAYER_ATTACK_RANGE
    )

    let monstersHit = 0
    monstersInRange.forEach(monster => {
      const monsterDamaged = this.monsterSystem.damageMonster(monster, damage)
      if (monsterDamaged) {
        monstersHit++
        // Show damage number on each monster hit
        this.showDamageNumber(monster.sprite.x, monster.sprite.y, damage, isCrit)
      }
    })

    // If it was a crit and we hit something, show a screen flash and crit text
    if (isCrit && monstersHit > 0) {
      this.showCritEffect(player.sprite.x, player.sprite.y)
    }

    return { hit: monstersHit > 0, isCrit, damage, monstersHit }
  }

  handlePlayerHit(player: Player, monsterSprite: Phaser.Physics.Arcade.Sprite, now: number): boolean {
    if (now - player.lastHitAt < PLAYER_HIT_COOLDOWN_MS) {
      return false
    }

    player.lastHitAt = now
    const monster = this.monsterSystem.getMonsterAt(monsterSprite)

    if (!monster) return false

    const damage = monster.getDamage()
    const died = player.takeDamage(damage)

    // Show player taking damage
    this.showDamageNumber(player.sprite.x, player.sprite.y - 30, damage, false, true)

    return died
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean, isPlayer: boolean = false) {
    const color = isCrit ? "#FFD700" : (isPlayer ? "#FF4444" : "#FFFFFF")
    const fontSize = isCrit ? "24px" : "18px"
    const text = this.scene.add.text(x, y - 40, damage.toFixed(1), {
      fontSize: fontSize,
      color: color,
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    // Add a little icon for crit
    if (isCrit) {
      this.scene.add.text(x - 25, y - 45, "⚡", {
        fontSize: "20px",
        color: "#FFD700",
        fontFamily: "Arial",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10)
    }

    // Animate the damage number
    this.scene.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      onComplete: () => text.destroy()
    })
  }

  private showCritEffect(x: number, y: number) {
    // Create a screen flash
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.midPoint.x,
      this.scene.cameras.main.midPoint.y,
      this.scene.scale.width,
      this.scene.scale.height,
      0xFFD700,
      0.3
    ).setDepth(100).setScrollFactor(0)

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    })

    // Create "CRITICAL!" text that floats up from the player
    const critText = this.scene.add.text(x, y - 50, "CRITICAL!", {
      fontSize: "28px",
      color: "#FFD700",
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10)

    this.scene.tweens.add({
      targets: critText,
      y: y - 120,
      scale: 1.5,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => critText.destroy()
    })

    // Add some sparkle particles around the player
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const sparkle = this.scene.add.circle(
        x + Math.cos(angle) * 40,
        y + Math.sin(angle) * 40,
        3,
        0xFFD700,
        0.8
      ).setDepth(9)

      this.scene.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * 80,
        y: y + Math.sin(angle) * 80,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        ease: "Power1",
        onComplete: () => sparkle.destroy()
      })
    }
  }

  private playSwordSwing(player: Player, isCrit: boolean) {
    if (!player.weaponSprite.visible) return

    player.updateWeaponFollow()

    this.scene.tweens.killTweensOf(player.weaponSprite)
    player.weaponSprite.setRotation(0)
    player.weaponSprite.setScale(2.1)

    // Sword swing animation
    this.scene.tweens.add({
      targets: player.weaponSprite,
      rotation: { from: -0.7, to: 0.9 },
      duration: 140,
      yoyo: true,
      ease: "Sine.easeInOut",
    })

    if (isCrit) {
      // Critical hit makes the sword bigger and glow
      this.scene.tweens.add({
        targets: player.weaponSprite,
        scale: 2.8,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      })

      // Add a glow effect to the sword
      const glow = this.scene.add.circle(
        player.weaponSprite.x,
        player.weaponSprite.y,
        30,
        0xFFD700,
        0.3
      ).setDepth(2)

      this.scene.tweens.add({
        targets: glow,
        scale: 2,
        alpha: 0,
        duration: 200,
        onComplete: () => glow.destroy()
      })
    }

    // Slash effect - bigger and more yellow for crit
    const slashColor = isCrit ? 0xFFD700 : 0xffffff
    const slashAlpha = isCrit ? 0.7 : 0.35
    const slashWidth = isCrit ? 80 : 60

    const slash = this.scene.add.rectangle(
      player.sprite.x, player.sprite.y, slashWidth, 15, slashColor, slashAlpha
    )
      .setDepth(3)
      .setAngle(player.weaponSprite.flipX ? 200 : 20)

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.5,
      duration: 150,
      onComplete: () => slash.destroy(),
    })
  }
}