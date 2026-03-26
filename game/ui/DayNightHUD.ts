import Phaser from "phaser"
import { DayNightState } from "../systems/Daynightsystem"

const PHASE_LABELS: Record<string, string> = {
  day: "Day",
  sunset: "Sunset",
  night: "Night",
  sunrise: "Sunrise",
}

const PHASE_COLORS: Record<string, number> = {
  day: 0xFFD87A,
  sunset: 0xFF8C42,
  night: 0x7AADFF,
  sunrise: 0xFFB5A0,
}

/**
 * DayNightHUD
 *
 * Renders a small sun/moon arc clock in the top-Left corner.
 * The arc fills clockwise as the day progresses.
 * The icon swaps between a sun (day/sunset/sunrise) and moon (night).
 */
export class DayNightHUD {
  private scene: Phaser.Scene
  private graphics: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  // private container: Phaser.GameObjects.Container

  // Position (screen space — fixed to camera)
  private readonly POS_X = 60
  private readonly POS_Y = 180
  private readonly RADIUS = 32

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.graphics = scene.add.graphics().setDepth(200)
    this.label = scene.add
      .text(this.POS_X, this.POS_Y + this.RADIUS + 10, "Day", {
        fontSize: "13px",
        color: "#FFD87A",
        fontFamily: "Alagard, monospace",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(200)
      .setScrollFactor(0)

    this.graphics.setScrollFactor(0)

    // Keep HUD anchored to the right side on resize
    scene.scale.on("resize", this.onResize, this)
  }

  update(state: DayNightState) {
    const { cycleProgress, phase } = state
    const x = this.POS_X
    const y = this.POS_Y + this.RADIUS
    const r = this.RADIUS
    const color = PHASE_COLORS[phase]

    this.graphics.clear()

    // ── Background arc track ─────────────────────────────────────────────────
    this.graphics.lineStyle(3, 0x333333, 0.6)
    this.graphics.beginPath()
    this.graphics.arc(x, y, r, 0, Math.PI * 2, false)
    this.graphics.strokePath()

    // ── Progress arc ─────────────────────────────────────────────────────────
    this.graphics.lineStyle(3, color, 0.9)
    this.graphics.beginPath()
    const startAngle = -Math.PI / 2                          // 12 o'clock
    const endAngle = startAngle + Math.PI * 2 * cycleProgress
    this.graphics.arc(x, y, r, startAngle, endAngle, false)
    this.graphics.strokePath()

    // ── Sun / Moon icon at the arc tip ───────────────────────────────────────
    const tipX = x + Math.cos(endAngle) * r
    const tipY = y + Math.sin(endAngle) * r
    const isNight = phase === "night"

    if (isNight) {
      this.drawMoon(tipX, tipY, color)
    } else {
      this.drawSun(tipX, tipY, color)
    }

    // ── Centre icon (small static) ───────────────────────────────────────────
    this.graphics.fillStyle(color, 0.25)
    this.graphics.fillCircle(x, y, r * 0.5)

    // ── Phase label ───────────────────────────────────────────────────────────
    this.label.setText(PHASE_LABELS[phase])
    this.label.setColor(`#${color.toString(16).padStart(6, "0")}`)
  }

  private drawSun(x: number, y: number, color: number) {
    const g = this.graphics
    g.fillStyle(color, 1)
    g.fillCircle(x, y, 5)
    // Rays
    g.lineStyle(1.5, color, 0.8)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const inner = 6, outer = 9
      g.beginPath()
      g.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
      g.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
      g.strokePath()
    }
  }

  private drawMoon(x: number, y: number, color: number) {
    const g = this.graphics
    // Crescent: big circle minus offset circle (clip-like using two arcs)
    g.fillStyle(color, 1)
    g.fillCircle(x, y, 5.5)
    // Occlude part with bg color to fake crescent
    g.fillStyle(0x000020, 1)
    g.fillCircle(x + 3, y - 1.5, 4.5)
  }

  private onResize() {
    // Re-anchor to right edge after resize
    ; (this as any).POS_X = this.scene.scale.width - 80
  }

  destroy() {
    this.graphics.destroy()
    this.label.destroy()
    this.scene.scale.off("resize", this.onResize, this)
  }
}
