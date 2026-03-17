import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { PLAYER_MAX_HP } from "../config/constants"

export class HUD {
  private woodText!: Phaser.GameObjects.Text
  private coinsText!: Phaser.GameObjects.Text
  private hpBarBg!: Phaser.GameObjects.Rectangle
  private hpBarFill!: Phaser.GameObjects.Rectangle
  private hpText!: Phaser.GameObjects.Text
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.createHUD()
  }

  private createHUD() {
    this.woodText = this.scene.add
      .text(20, 20, "🪵  Wood: 0", {
        fontSize: "20px", color: "#e8dcc8", fontFamily: "Georgia",
        backgroundColor: "#00000099", padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0).setDepth(10)

    this.coinsText = this.scene.add
      .text(20, 56, "🪙  Coins: 0", {
        fontSize: "20px", color: "#FFD700", fontFamily: "Georgia",
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
      fontFamily: "Arial",
      fontStyle: "bold",
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(12)
  }

  update(player: Player) {
    this.woodText.setText("🪵  Wood: " + player.wood)
    this.coinsText.setText("🪙  Coins: " + player.coins)
    
    const ratio = Phaser.Math.Clamp(player.hp / PLAYER_MAX_HP, 0, 1)
    const fullW = (this.hpBarBg.width as number) - 4
    this.hpBarFill.width = Math.max(0, Math.floor(fullW * ratio))
    
    const color = ratio > 0.55 ? 0x22cc55 : ratio > 0.25 ? 0xe1b500 : 0xcc3344
    this.hpBarFill.setFillStyle(color, 0.9)
    this.hpText.setText(`❤ ${Math.max(0, Math.ceil(player.hp * 10) / 10)}/${PLAYER_MAX_HP}`)
  }
}