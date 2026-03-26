import { DayNightState } from "./Daynightsystem"
import { WORLD_SIZE, GRID_SIZE } from "../config/constants"

/**
 * WorldOverlay
 *
 * Two full-world rectangles drawn above the tilemap but below the HUD:
 *   1. darknessRect  — black with alpha driven by state.darkness
 *   2. tintRect      — colored (sunset orange / night blue / sunrise purple)
 *
 * Both stay fixed to the world (not the camera) so they cover everything.
 */
export class WorldOverlay {
  private darknessRect: Phaser.GameObjects.Rectangle
  private tintRect: Phaser.GameObjects.Rectangle

  // Smoothing: current rendered values interpolate toward target each frame
  private currentDarkness = 0
  private currentTint = { r: 255, g: 220, b: 160, a: 0 }

  /** How quickly the overlay tracks the target value (0-1 per second) */
  private readonly LERP_SPEED = 0.015

  constructor(scene: Phaser.Scene) {
    // Depth: above tilemap (0) and sprites (1-2), below HUD (100+)
    const OVERLAY_DEPTH = 50

    const mapSize = Math.ceil(WORLD_SIZE / GRID_SIZE) * GRID_SIZE

    this.darknessRect = scene.add
      .rectangle(mapSize / 2, mapSize / 2, mapSize, mapSize, 0x000000, 0)
      .setDepth(OVERLAY_DEPTH)
      .setAlpha(0)

    this.tintRect = scene.add
      .rectangle(mapSize / 2, mapSize / 2, mapSize, mapSize, 0xffffff, 0)
      .setDepth(OVERLAY_DEPTH + 1)
      .setAlpha(0)
  }

  update(state: DayNightState, delta: number) {
    const t = Math.min(1, this.LERP_SPEED * (delta / 16.67)) // frame-rate independent

    // ── Darkness ─────────────────────────────────────────────────────────────
    this.currentDarkness = Phaser.Math.Linear(
      this.currentDarkness,
      state.darkness,
      t
    )
    this.darknessRect.setAlpha(this.currentDarkness)

    // ── Color tint ───────────────────────────────────────────────────────────
    const target = state.tintColor
    this.currentTint.r = Phaser.Math.Linear(this.currentTint.r, target.r, t)
    this.currentTint.g = Phaser.Math.Linear(this.currentTint.g, target.g, t)
    this.currentTint.b = Phaser.Math.Linear(this.currentTint.b, target.b, t)
    this.currentTint.a = Phaser.Math.Linear(this.currentTint.a, target.a, t)

    const hexColor =
      (Math.round(this.currentTint.r) << 16) |
      (Math.round(this.currentTint.g) << 8) |
      Math.round(this.currentTint.b)

    this.tintRect.setFillStyle(hexColor)
    this.tintRect.setAlpha(this.currentTint.a)
  }

  destroy() {
    this.darknessRect.destroy()
    this.tintRect.destroy()
  }
}
