import {
    DAY_CYCLE_DURATION_MS,
    DAY_NIGHT_PHASES,
    DayPhase,
} from "../config/constants"

export interface DayNightState {
    /** 0 → 1, position within the full cycle */
    cycleProgress: number
    /** Current named phase */
    phase: DayPhase
    /** 0 → 1 progress within the current phase alone */
    phaseProgress: number
    /** 0 (noon) → 1 (midnight), drives overlay alpha */
    darkness: number
    /** RGBA tint to layer over the world */
    tintColor: { r: number; g: number; b: number; a: number }
}

type PhaseChangeCallback = (phase: DayPhase) => void

// ─── Phase boundary thresholds (cumulative) ────────────────────────────────
const PHASE_STARTS: Record<DayPhase, number> = (() => {
    const entries = Object.entries(DAY_NIGHT_PHASES) as [DayPhase, number][]
    let cursor = 0
    const result = {} as Record<DayPhase, number>
    for (const [phase, duration] of entries) {
        result[phase] = cursor
        cursor += duration
    }
    return result
})()

export class DayNightSystem {
    private scene: Phaser.Scene
    private elapsed = 0
    private currentPhase: DayPhase = "day"
    private phaseListeners: PhaseChangeCallback[] = []

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    // ── Called every frame from MainScene.update() ────────────────────────────
    update(delta: number): DayNightState {
        this.elapsed = (this.elapsed + delta) % DAY_CYCLE_DURATION_MS

        const cycleProgress = this.elapsed / DAY_CYCLE_DURATION_MS
        const phase = this.resolvePhase(cycleProgress)
        const phaseProgress = this.resolvePhaseProgress(cycleProgress, phase)

        // Fire listeners when the phase changes
        if (phase !== this.currentPhase) {
            this.currentPhase = phase
            this.phaseListeners.forEach((cb) => cb(phase))
        }

        const darkness = this.calcDarkness(phase, phaseProgress)
        const tintColor = this.calcTint(phase, phaseProgress)

        return { cycleProgress, phase, phaseProgress, darkness, tintColor }
    }

    onPhaseChange(cb: PhaseChangeCallback) {
        this.phaseListeners.push(cb)
    }

    getPhase(): DayPhase {
        return this.currentPhase
    }

    /** Force-set cycle to a given progress (0-1) — useful for testing */
    setCycleProgress(t: number) {
        this.elapsed = Phaser.Math.Clamp(t, 0, 1) * DAY_CYCLE_DURATION_MS
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private resolvePhase(t: number): DayPhase {
        const phases = Object.keys(DAY_NIGHT_PHASES) as DayPhase[]
        // Walk phases in reverse so the last matching start wins
        for (let i = phases.length - 1; i >= 0; i--) {
            if (t >= PHASE_STARTS[phases[i]]) return phases[i]
        }
        return "day"
    }

    private resolvePhaseProgress(t: number, phase: DayPhase): number {
        const start = PHASE_STARTS[phase]
        const duration = DAY_NIGHT_PHASES[phase]
        return (t - start) / duration
    }

    /**
     * darkness:
     *   day      → 0   (no overlay)
     *   sunset   → 0 → 0.65  (getting darker)
     *   night    → 0.65 → 0.85 → 0.65  (peak midnight at 0.5)
     *   sunrise  → 0.65 → 0   (lifting)
     */
    private calcDarkness(phase: DayPhase, t: number): number {
        switch (phase) {
            case "day": return 0
            case "sunset": return Phaser.Math.Linear(0, 0.65, t)
            case "night": return t < 0.5
                ? Phaser.Math.Linear(0.65, 0.5, t * 2)
                : Phaser.Math.Linear(0.85, 0.65, (t - 0.5) * 2)
            case "sunrise": return Phaser.Math.Linear(0.65, 0, t)
        }
    }

    /**
     * Tint blends:
     *   day      → clear (0 alpha)
     *   sunset   → warm orange  rgba(180, 80, 20, α)
     *   night    → cold blue    rgba(10,  20, 80, α)
     *   sunrise  → cool → warm  rgba(60, 40, 120, α) → rgba(180, 100, 30, α)
     */
    private calcTint(
        phase: DayPhase,
        t: number
    ): { r: number; g: number; b: number; a: number } {
        switch (phase) {
            case "day":
                return { r: 255, g: 220, b: 160, a: 0 }

            case "sunset": {
                const a = Phaser.Math.Linear(0, 0.38, t)
                return { r: 180, g: 80, b: 20, a }
            }

            case "night": {
                // Fade orange tint out, fade blue tint in during first half
                const a = t < 0.3
                    ? Phaser.Math.Linear(0.38, 0.18, t / 0.3)
                    : 0.18
                return { r: 10, g: 20, b: 80, a }
            }

            case "sunrise": {
                // First half: cool blue, second half: warm orange lift
                const r = Phaser.Math.Linear(30, 180, t)
                const g = Phaser.Math.Linear(40, 110, t)
                const b = Phaser.Math.Linear(120, 30, t)
                const a = t < 0.5
                    ? Phaser.Math.Linear(0.18, 0.30, t * 2)
                    : Phaser.Math.Linear(0.30, 0, (t - 0.5) * 2)
                return { r, g, b, a }
            }
        }
    }

    fastForward(fraction: number) {
        this.elapsed = (this.elapsed + DAY_CYCLE_DURATION_MS * fraction) % DAY_CYCLE_DURATION_MS
    }

}