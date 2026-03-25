import { Player } from "../entities/Player"
import { PLAYER_MAX_HP } from "../config/constants"
import { QuestSystem } from "../systems/QuestSystem"

export class HUD {
  private woodText!: Phaser.GameObjects.Text
  private coinsText!: Phaser.GameObjects.Text
  private hpBarBg!: Phaser.GameObjects.Rectangle
  private hpBarFill!: Phaser.GameObjects.Rectangle
  private hpText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private xpBarBg!: Phaser.GameObjects.Rectangle
  private xpBarFill!: Phaser.GameObjects.Rectangle
  private questText!: Phaser.GameObjects.Text
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.createHUD()
  }

  private createHUD() {
    this.woodText = this.scene.add
      .text(20, 20, "🪵  Wood: 0", {
        fontSize: "20px", color: "#e8dcc8", fontFamily: "Alagard",
        backgroundColor: "#00000099", padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0).setDepth(10)

    this.coinsText = this.scene.add
      .text(20, 56, "🪙  Coins: 0", {
        fontSize: "20px", color: "#FFD700", fontFamily: "Alagard",
        backgroundColor: "#00000099", padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0).setDepth(10)

    // health bar
    const barX = 20
    const barY = 96
    const barW = 190
    const barH = 18

    this.hpBarBg = this.scene.add.rectangle(barX, barY, barW, barH, 0x000000, 0.6)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(10)
    this.hpBarFill = this.scene.add.rectangle(barX + 2, barY + 2, barW - 4, barH - 4, 0x22cc55, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(11)
    this.hpText = this.scene.add.text(barX + barW / 2, barY + 1, `❤ ${PLAYER_MAX_HP}/${PLAYER_MAX_HP}`, {
      fontSize: "14px",
      color: "#ffffff",
      fontFamily: "Alagard",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(12)

    // Level and XP
    this.levelText = this.scene.add.text(20, 125, "Level: 1", {
      fontSize: "22px", color: "#FFD700", fontFamily: "Alagard",
      fontStyle: "bold", stroke: "#000000", strokeThickness: 3
    }).setScrollFactor(0).setDepth(10)

    this.xpBarBg = this.scene.add.rectangle(20, 155, 190, 8, 0x000000, 0.6)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(10)
    this.xpBarFill = this.scene.add.rectangle(22, 157, 0, 4, 0x4488ff, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(11)

    // Quests
    this.questText = this.scene.add.text(this.scene.cameras.main.width - 20, 20, "Challenges:", {
      fontSize: "18px", color: "#ffffff", fontFamily: "Alagard",
      backgroundColor: "#00000066", padding: { x: 10, y: 5 },
      align: "right"
    }).setScrollFactor(0).setDepth(10).setOrigin(1, 0)
  }

  update(player: Player, questSystem?: QuestSystem) {
    this.woodText.setText("🪵  Wood: " + player.inventory.countItem("wood"))
    this.coinsText.setText("🪙  Coins: " + player.inventory.getGold())

    // HP Bar
    const ratio = Phaser.Math.Clamp(player.hp / player.maxHp, 0, 1)
    const fullW = (this.hpBarBg.width as number) - 4
    this.hpBarFill.width = Math.max(0, Math.floor(fullW * ratio))

    const color = ratio > 0.55 ? 0x22cc55 : ratio > 0.25 ? 0xe1b500 : 0xcc3344
    this.hpBarFill.setFillStyle(color, 0.9)
    this.hpText.setText(`❤ ${Math.max(0, Math.ceil(player.hp * 10) / 10)}/${Math.ceil(player.maxHp)}`)

    // Level & XP
    this.levelText.setText(`Level: ${player.level}`)
    const xpRatio = Phaser.Math.Clamp(player.xp / player.xpToNextLevel, 0, 1)
    this.xpBarFill.width = Math.max(0, Math.floor(186 * xpRatio))

    // Quests
    if (questSystem) {
      let questStr = "Challenges:\n"
      questSystem.getActiveQuests().forEach(q => {
        questStr += `• ${q.description}: ${q.currentCount}/${q.targetCount}\n`
      })
      this.questText.setText(questStr)
    }
  }
}