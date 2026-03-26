import { DayPhase } from "../config/constants"
import { MonsterSystem } from "./MonsterSystem"

/**
 * NightSpawnController
 *
 * Listens for day/night phase changes from DayNightSystem and adjusts
 * MonsterSystem's spawn rate multiplier accordingly.
 *
 * Usage:
 *   const nightSpawn = new NightSpawnController(this.monsterSystem)
 *   this.dayNightSystem.onPhaseChange((phase) => nightSpawn.onPhaseChange(phase))
 *
 * To make this work you need to add one method to MonsterSystem:
 *   setSpawnMultiplier(multiplier: number): void
 *   (see comment at bottom of this file)
 */

const SPAWN_MULTIPLIERS: Record<DayPhase, number> = {
  day: 1.0,   // normal
  sunset: 1.5,   // slightly busier
  night: 3.0,   // dangerous — triple spawn rate
  sunrise: 1.5,   // still elevated
}

export class NightSpawnController {
  private monsterSystem: MonsterSystem
  private currentMultiplier = 1.0

  constructor(monsterSystem: MonsterSystem) {
    this.monsterSystem = monsterSystem
  }

  onPhaseChange(phase: DayPhase) {
    const multiplier = SPAWN_MULTIPLIERS[phase]
    if (multiplier === this.currentMultiplier) return

    this.currentMultiplier = multiplier
    this.monsterSystem.setSpawnMultiplier(multiplier)

    console.log(`[DayNight] Phase → ${phase} | Spawn multiplier: ×${multiplier}`)
  }

  getMultiplier(): number {
    return this.currentMultiplier
  }
}
