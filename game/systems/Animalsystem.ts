import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { WORLD_SIZE, GRID_SIZE } from "../config/constants"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS  — tweak anything here without touching logic
// ─────────────────────────────────────────────────────────────────────────────

/** Set to true to log debug info and spawn animals near the player start */
const ANIMAL_DEBUG = true

/** How close the player must get (px) to trigger a flee */
const FLEE_TRIGGER_RADIUS = 120

/** How far the animal flees before it stops */
const FLEE_DISTANCE = 250

/** After fleeing, how long (ms) before the animal resumes wandering */
const FLEE_COOLDOWN_MS = 4000

/** How often each animal picks a new wander target (ms) */
const WANDER_INTERVAL_MS = 3000

/** Max px an animal wanders from its herd anchor per step */
const WANDER_RADIUS = 160

/** How close herd-mates stay to their anchor (px) */
const HERD_COHESION_RADIUS = 200

/** Movement speeds (px/s) */
const SPEED = {
    walk: 60,
    run: 180,
    blackGrouseWalk: 55, // black grouse has no run sheet, uses walk speed to flee
} as const

/** Frame rates per animation */
const FPS = {
    idle: 4,
    walk: 8,
    run: 10,
} as const

/** Herd sizes — min/max animals spawned per herd */
const HERD_SIZE = { min: 3, max: 6 } as const

/** How many herds of each species to spawn */
const HERD_COUNT: Record<AnimalSpecies, number> = {
    fox: 3,
    deer: 3,
    black_grouse: 4,
    calf: 2,
    lamb: 3,
}

/** Distance range for animal spawning (px) - animals spawn between these distances from player */
const SPAWN_DISTANCE = {
    MIN: 800,  // Don't spawn too close to player
    MAX: 1500, // Spawn up to this far away
}

/** Distance at which animals despawn (px) - must be larger than SPAWN_DISTANCE.MAX */
const DESPAWN_DISTANCE = 2000

/** How often to check for spawning/despawning animals (ms) */
const SPAWN_CHECK_INTERVAL_MS = 2000

/** Animal scale multiplier (making them larger) */
const ANIMAL_SCALE = 2.0

/**
 * World spawn bounds derived from your constants.
 * WORLD_SIZE is the chunk/tile count, GRID_SIZE is px per tile,
 * so real world pixel size = WORLD_SIZE * GRID_SIZE.
 * We keep a 300px margin on each side so animals don't spawn on the edge.
 */
const WORLD_PX = WORLD_SIZE * GRID_SIZE          // e.g. 1500 * 48 = 72000
const SPAWN_MARGIN = 300
const WORLD_BOUNDS = {
    minX: SPAWN_MARGIN,
    minY: SPAWN_MARGIN,
    maxX: WORLD_PX - SPAWN_MARGIN,
    maxY: WORLD_PX - SPAWN_MARGIN,
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE-SHEET DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

type AnimalSpecies = "fox" | "deer" | "black_grouse" | "calf" | "lamb"

/**
 * Row layout (0-indexed) used by every standard sheet:
 *   row 0 → facing camera (down)
 *   row 1 → facing away   (up)
 *   row 2 → facing right
 *   row 3 → facing left
 */
const DIR_ROW = { down: 0, up: 1, right: 2, left: 3 } as const
type FacingDir = keyof typeof DIR_ROW

interface SheetConfig {
    key: string
    path: string
    frameWidth: number
    frameHeight: number
    cols: number
    rows: number
}

/** All sprite-sheet definitions */
const SHEETS: SheetConfig[] = [
    // Fox
    { key: "fox_run", path: "/assets/animals/Fox/Fox_Run_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 4 },
    { key: "fox_walk", path: "/assets/animals/Fox/Fox_walk_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 4 },
    { key: "fox_idle", path: "/assets/animals/Fox/Fox_Idle_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },

    // Deer
    { key: "deer_run", path: "/assets/animals/Deer/Deer_Run_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 4 },
    { key: "deer_walk", path: "/assets/animals/Deer/Deer_Walk_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 4 },
    { key: "deer_idle", path: "/assets/animals/Deer/Deer_Idle_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },

    // Black Grouse (no run sheet — walk used for flee too)
    { key: "black_grouse_walk", path: "/assets/animals/Black_grouse/Black_grouse_Walk_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 4 },
    { key: "black_grouse_idle", path: "/assets/animals/Black_grouse/Black_grouse_Idle_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },

    // Calf — combined 6×8 sheet: top 6×4 = run, bottom 4×4 = idle
    { key: "calf_combined", path: "/assets/animals/Calf_animation_with_shadow.png", frameWidth: 64, frameHeight: 64, cols: 6, rows: 8 },

    // Lamb — combined 6×8 sheet: top 6×4 = run, bottom 4×4 = idle
    { key: "lamb_combined", path: "/assets/animals/Lamb_animation_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 6, rows: 8 },
]

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

interface AnimDef {
    key: string        // Phaser anim key
    sheet: string      // spritesheet key
    startFrame: number // first absolute frame index in the sheet
    frameCount: number
    frameRate: number
    repeat: number     // -1 = loop
}

/** Build absolute frame index from row/col in a sheet with `cols` columns */
function frameIndex(row: number, col: number, cols: number): number {
    return row * cols + col
}

function buildAnimDefs(): AnimDef[] {
    const defs: AnimDef[] = []

    const dirs = Object.keys(DIR_ROW) as FacingDir[]

    // ── Helper: standard 6-col run/walk sheet ─────────────────────────────
    const addRunWalk = (species: string, runSheet: string, walkSheet: string) => {
        dirs.forEach((dir) => {
            const row = DIR_ROW[dir]
                ; (["run", "walk"] as const).forEach((anim) => {
                    const sheet = anim === "run" ? runSheet : walkSheet
                    const fps = anim === "run" ? FPS.run : FPS.walk
                    defs.push({
                        key: `${species}_${anim}_${dir}`,
                        sheet,
                        startFrame: frameIndex(row, 0, 6),
                        frameCount: 6,
                        frameRate: fps,
                        repeat: -1,
                    })
                })
        })
    }

    // ── Helper: standard 4-col idle sheet ─────────────────────────────────
    const addIdle = (species: string, idleSheet: string) => {
        dirs.forEach((dir) => {
            const row = DIR_ROW[dir]
            defs.push({
                key: `${species}_idle_${dir}`,
                sheet: idleSheet,
                startFrame: frameIndex(row, 0, 4),
                frameCount: 4,
                frameRate: FPS.idle,
                repeat: -1,
            })
        })
    }

    // ── Fox ───────────────────────────────────────────────────────────────
    addRunWalk("fox", "fox_run", "fox_walk")
    addIdle("fox", "fox_idle")

    // ── Deer ──────────────────────────────────────────────────────────────
    addRunWalk("deer", "deer_run", "deer_walk")
    addIdle("deer", "deer_idle")

    // ── Black Grouse (walk used for flee — no separate run sheet) ─────────
    dirs.forEach((dir) => {
        const row = DIR_ROW[dir]
        defs.push({
            key: `black_grouse_walk_${dir}`,
            sheet: "black_grouse_walk",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.walk,
            repeat: -1,
        })
        defs.push({
            key: `black_grouse_run_${dir}`, // alias → same frames, faster rate
            sheet: "black_grouse_walk",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.run,
            repeat: -1,
        })
    })
    addIdle("black_grouse", "black_grouse_idle")

    // ── Calf — combined sheet: rows 0-3 = run (6 cols), rows 4-7 = idle (4 cols)
    dirs.forEach((dir) => {
        const row = DIR_ROW[dir]

        // Run rows sit at the top of the sheet (rows 0-3), 6 frames wide
        defs.push({
            key: `calf_run_${dir}`,
            sheet: "calf_combined",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.run,
            repeat: -1,
        })

        // Walk — reuse run frames at walk speed
        defs.push({
            key: `calf_walk_${dir}`,
            sheet: "calf_combined",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.walk,
            repeat: -1,
        })

        // Idle rows sit at rows 4-7, but only 4 frames wide.
        // We still use frameIndex with cols=6 because the sheet is 6 columns wide;
        // the idle animation only occupies the first 4 columns of those rows.
        defs.push({
            key: `calf_idle_${dir}`,
            sheet: "calf_combined",
            startFrame: frameIndex(row + 4, 0, 6),
            frameCount: 4,
            frameRate: FPS.idle,
            repeat: -1,
        })
    })

    // ── Lamb — identical layout to Calf ────────────────────────────────────
    dirs.forEach((dir) => {
        const row = DIR_ROW[dir]

        defs.push({
            key: `lamb_run_${dir}`,
            sheet: "lamb_combined",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.run,
            repeat: -1,
        })

        defs.push({
            key: `lamb_walk_${dir}`,
            sheet: "lamb_combined",
            startFrame: frameIndex(row, 0, 6),
            frameCount: 6,
            frameRate: FPS.walk,
            repeat: -1,
        })

        defs.push({
            key: `lamb_idle_${dir}`,
            sheet: "lamb_combined",
            startFrame: frameIndex(row + 4, 0, 6),
            frameCount: 4,
            frameRate: FPS.idle,
            repeat: -1,
        })
    })

    return defs
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

type AnimalState = "idle" | "wander" | "flee" | "post_flee"

interface AnimalData {
    sprite: Phaser.Physics.Arcade.Sprite
    species: AnimalSpecies
    state: AnimalState
    facing: FacingDir
    wanderTarget: Phaser.Math.Vector2
    wanderTimer: number        // ms until next wander target
    fleeTimer: number          // ms remaining in post-flee cooldown
    herdAnchor: Phaser.Math.Vector2
    isActive: boolean          // whether the animal is currently in the world
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export class AnimalSystem {
    private scene: Phaser.Scene
    private animals: AnimalData[] = []
    private group!: Phaser.Physics.Arcade.Group
    private spawnCheckTimer: number = 0
    private activeHerds: Map<string, Phaser.Math.Vector2> = new Map() // Track herd anchors

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    // ── Called from MainScene.preload() ──────────────────────────────────────
    preload(): void {
        for (const s of SHEETS) {
            this.scene.load.spritesheet(s.key, s.path, {
                frameWidth: s.frameWidth,
                frameHeight: s.frameHeight,
            })
        }
    }

    // ── Called from MainScene.create() ───────────────────────────────────────
    create(): void {
        this.group = this.scene.physics.add.group()
        this.registerAnimations()

        if (ANIMAL_DEBUG) {
            console.log(`[AnimalSystem] WORLD_PX = ${WORLD_PX}`)
            console.log(`[AnimalSystem] WORLD_BOUNDS =`, WORLD_BOUNDS)
            console.log(`[AnimalSystem] Animal scale: ${ANIMAL_SCALE}x`)
            console.log(`[AnimalSystem] Spawn distance: ${SPAWN_DISTANCE.MIN}-${SPAWN_DISTANCE.MAX}px`)
            console.log(`[AnimalSystem] Despawn distance: ${DESPAWN_DISTANCE}px`)

            // Spawn one of each species right next to player start so you can see
            // them immediately. Set ANIMAL_DEBUG = false once confirmed working.
            const debugSpecies: AnimalSpecies[] = ["fox", "deer", "black_grouse", "calf", "lamb"]
            const playerSprite = (this.scene as any).player?.sprite
            const startX: number = playerSprite?.x ?? 700
            const startY: number = playerSprite?.y ?? 1050
            debugSpecies.forEach((sp, i) => {
                const ax = startX + i * 100
                const ay = startY + 120
                const anchor = new Phaser.Math.Vector2(ax, ay)
                this.spawnAnimal(sp, ax, ay, anchor)
                console.log(`[AnimalSystem] Debug spawned ${sp} at ${ax}, ${ay}`)
            })
        }

        this.spawnAllHerds()
        this.spawnCheckTimer = SPAWN_CHECK_INTERVAL_MS

        if (ANIMAL_DEBUG) {
            console.log(`[AnimalSystem] Total animals spawned: ${this.animals.length}`)
            if (this.animals.length > 0) {
                const a = this.animals[0]
                console.log(`[AnimalSystem] First animal (${a.species}) at`, a.sprite.x, a.sprite.y)
            }
        }
    }

    // ── Called from MainScene.update() ───────────────────────────────────────
    update(player: Player, delta: number): void {
        const px = player.sprite.x
        const py = player.sprite.y

        // Update spawn/despawn timer
        this.spawnCheckTimer -= delta
        if (this.spawnCheckTimer <= 0) {
            this.spawnCheckTimer = SPAWN_CHECK_INTERVAL_MS
            this.manageAnimalSpawning(px, py)
        }

        // Update active animals only
        for (const animal of this.animals) {
            if (animal.isActive) {
                this.updateAnimal(animal, px, py, delta)
            }
        }
    }

    getGroup(): Phaser.Physics.Arcade.Group {
        return this.group
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Registration
    // ─────────────────────────────────────────────────────────────────────────

    private registerAnimations(): void {
        const defs = buildAnimDefs()
        for (const def of defs) {
            if (this.scene.anims.exists(def.key)) continue

            const frames = this.scene.anims.generateFrameNumbers(def.sheet, {
                start: def.startFrame,
                end: def.startFrame + def.frameCount - 1,
            })

            this.scene.anims.create({
                key: def.key,
                frames,
                frameRate: def.frameRate,
                repeat: def.repeat,
            })
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Spawning Management
    // ─────────────────────────────────────────────────────────────────────────

    private manageAnimalSpawning(px: number, py: number): void {
        // Check for animals to despawn
        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i]
            const distToPlayer = Phaser.Math.Distance.Between(
                animal.sprite.x, animal.sprite.y, px, py
            )

            if (animal.isActive && distToPlayer > DESPAWN_DISTANCE) {
                this.despawnAnimal(animal)
            } else if (!animal.isActive && distToPlayer <= DESPAWN_DISTANCE && distToPlayer >= SPAWN_DISTANCE.MIN) {
                this.respawnAnimal(animal)
            }
        }

        // Check if we need to spawn more herds
        const activeAnimals = this.animals.filter(a => a.isActive).length
        const targetAnimalCount = Object.values(HERD_COUNT).reduce((a, b) => a + b, 0) *
            (HERD_SIZE.min + HERD_SIZE.max) / 2

        if (activeAnimals < targetAnimalCount * 0.7) {
            this.spawnMissingHerds(px, py)
        }
    }

    private spawnMissingHerds(px: number, py: number): void {
        const species = Object.keys(HERD_COUNT) as AnimalSpecies[]

        for (const sp of species) {
            // Count active herds of this species
            const activeHerdsOfSpecies = this.animals.filter(a =>
                a.species === sp && a.isActive
            ).length / HERD_SIZE.min

            if (activeHerdsOfSpecies < HERD_COUNT[sp]) {
                // Spawn a new herd near the player but not too close
                const angle = Math.random() * Math.PI * 2
                const distance = Phaser.Math.Between(SPAWN_DISTANCE.MIN, SPAWN_DISTANCE.MAX)
                const anchorX = Phaser.Math.Clamp(
                    px + Math.cos(angle) * distance,
                    WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX
                )
                const anchorY = Phaser.Math.Clamp(
                    py + Math.sin(angle) * distance,
                    WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY
                )

                this.spawnHerd(sp, new Phaser.Math.Vector2(anchorX, anchorY))
            }
        }
    }

    private spawnAllHerds(): void {
        const species = Object.keys(HERD_COUNT) as AnimalSpecies[]
        for (const sp of species) {
            const count = HERD_COUNT[sp]
            for (let h = 0; h < count; h++) {
                const anchorX = Phaser.Math.Between(WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX)
                const anchorY = Phaser.Math.Between(WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY)
                const anchor = new Phaser.Math.Vector2(anchorX, anchorY)
                this.spawnHerd(sp, anchor)
            }
        }
    }

    private spawnHerd(species: AnimalSpecies, anchor: Phaser.Math.Vector2): void {
        const size = Phaser.Math.Between(HERD_SIZE.min, HERD_SIZE.max)
        for (let i = 0; i < size; i++) {
            const offsetX = Phaser.Math.Between(-80, 80)
            const offsetY = Phaser.Math.Between(-80, 80)
            this.spawnAnimal(species, anchor.x + offsetX, anchor.y + offsetY, anchor)
        }
    }

    private spawnAnimal(
        species: AnimalSpecies,
        x: number,
        y: number,
        herdAnchor: Phaser.Math.Vector2,
    ): void {
        // Determine which spritesheet key to use for the sprite itself
        const idleSheet = this.getIdleSheet(species)

        const sprite = this.scene.physics.add.sprite(x, y, idleSheet)
        sprite.setCollideWorldBounds(false)
        sprite.setDepth(5)
        sprite.setScale(ANIMAL_SCALE) // Make animals larger!
        this.group.add(sprite)

        const animal: AnimalData = {
            sprite,
            species,
            state: "idle",
            facing: "down",
            wanderTarget: new Phaser.Math.Vector2(x, y),
            wanderTimer: Phaser.Math.Between(0, WANDER_INTERVAL_MS),
            fleeTimer: 0,
            herdAnchor: herdAnchor.clone(),
            isActive: true, // Initially active
        }

        this.playAnim(animal, "idle")
        this.animals.push(animal)
    }

    private despawnAnimal(animal: AnimalData): void {
        if (!animal.isActive) return

        animal.isActive = false
        animal.sprite.setVisible(false)
        animal.sprite.setActive(false)
        // Check if body exists before disabling
        if (animal.sprite.body) {
            animal.sprite.body.enable = false
        }
        this.stopMovement(animal)
    }

    private respawnAnimal(animal: AnimalData): void {
        if (animal.isActive) return

        // Find a new position near the herd anchor but within spawn distance
        const angle = Math.random() * Math.PI * 2
        const distance = Phaser.Math.Between(50, 150)
        const newX = Phaser.Math.Clamp(
            animal.herdAnchor.x + Math.cos(angle) * distance,
            WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX
        )
        const newY = Phaser.Math.Clamp(
            animal.herdAnchor.y + Math.sin(angle) * distance,
            WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY
        )

        animal.sprite.setPosition(newX, newY)
        animal.sprite.setVisible(true)
        animal.sprite.setActive(true)
        // Check if body exists before enabling
        if (animal.sprite.body) {
            animal.sprite.body.enable = true
        }
        animal.isActive = true
        animal.state = "idle"
        animal.wanderTimer = Phaser.Math.Between(0, WANDER_INTERVAL_MS)
        this.playAnim(animal, "idle")
    }

    private getIdleSheet(species: AnimalSpecies): string {
        switch (species) {
            case "fox": return "fox_idle"
            case "deer": return "deer_idle"
            case "black_grouse": return "black_grouse_idle"
            case "calf": return "calf_combined"
            case "lamb": return "lamb_combined"
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Per-animal update
    // ─────────────────────────────────────────────────────────────────────────

    private updateAnimal(animal: AnimalData, px: number, py: number, delta: number): void {
        const { sprite } = animal
        const distToPlayer = Phaser.Math.Distance.Between(sprite.x, sprite.y, px, py)

        switch (animal.state) {

            // ── IDLE / WANDER ───────────────────────────────────────────────────
            case "idle":
            case "wander": {
                // Check flee trigger
                if (distToPlayer < FLEE_TRIGGER_RADIUS) {
                    this.startFlee(animal, px, py)
                    break
                }

                animal.wanderTimer -= delta
                if (animal.wanderTimer <= 0) {
                    animal.wanderTimer = WANDER_INTERVAL_MS + Phaser.Math.Between(-500, 500)

                    // Randomly decide idle vs wander
                    if (Math.random() < 0.4) {
                        animal.state = "idle"
                        this.stopMovement(animal)
                        this.playAnim(animal, "idle")
                    } else {
                        animal.state = "wander"
                        this.pickWanderTarget(animal)
                    }
                }

                if (animal.state === "wander") {
                    this.moveToward(animal, animal.wanderTarget.x, animal.wanderTarget.y, SPEED.walk, delta)

                    // Arrived at target?
                    const dist = Phaser.Math.Distance.Between(
                        sprite.x, sprite.y,
                        animal.wanderTarget.x, animal.wanderTarget.y,
                    )
                    if (dist < 8) {
                        animal.state = "idle"
                        this.stopMovement(animal)
                        this.playAnim(animal, "idle")
                    }
                }
                break
            }

            // ── FLEE ────────────────────────────────────────────────────────────
            case "flee": {
                const fleeTarget = animal.wanderTarget // reused as flee direction target

                // Keep updating flee direction while player is still close
                if (distToPlayer < FLEE_TRIGGER_RADIUS * 1.5) {
                    this.updateFleeTarget(animal, px, py)
                }

                this.moveToward(animal, fleeTarget.x, fleeTarget.y, this.getRunSpeed(animal.species), delta)

                const distToTarget = Phaser.Math.Distance.Between(
                    sprite.x, sprite.y, fleeTarget.x, fleeTarget.y,
                )
                if (distToTarget < 16) {
                    animal.state = "post_flee"
                    animal.fleeTimer = FLEE_COOLDOWN_MS
                    this.stopMovement(animal)
                    this.playAnim(animal, "idle")
                }
                break
            }

            // ── POST FLEE COOLDOWN ───────────────────────────────────────────────
            case "post_flee": {
                animal.fleeTimer -= delta
                if (distToPlayer < FLEE_TRIGGER_RADIUS) {
                    // Player is still close — flee again immediately
                    this.startFlee(animal, px, py)
                } else if (animal.fleeTimer <= 0) {
                    animal.state = "idle"
                    animal.wanderTimer = WANDER_INTERVAL_MS
                }
                break
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Movement helpers
    // ─────────────────────────────────────────────────────────────────────────

    private moveToward(
        animal: AnimalData,
        tx: number,
        ty: number,
        speed: number,
        _delta: number,
    ): void {
        const { sprite } = animal
        const dx = tx - sprite.x
        const dy = ty - sprite.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 2) return

        const vx = (dx / len) * speed
        const vy = (dy / len) * speed
        sprite.setVelocity(vx, vy)

        // Update facing based on velocity direction
        const newFacing = this.vecToFacing(vx, vy)

        // Only update if facing changed
        if (newFacing !== animal.facing) {
            animal.facing = newFacing
            // Determine animation type based on state
            let animType: "idle" | "walk" | "run" = "walk"
            if (animal.state === "flee") {
                animType = "run"
            } else if (animal.state === "idle") {
                animType = "idle"
            } else {
                animType = "walk"
            }
            this.playAnim(animal, animType)
        }
    }


    private stopMovement(animal: AnimalData): void {
        animal.sprite.setVelocity(0, 0)
    }

    private pickWanderTarget(animal: AnimalData): void {
        // Wander within WANDER_RADIUS of the herd anchor, clamped to world bounds
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * WANDER_RADIUS
        const tx = Phaser.Math.Clamp(
            animal.herdAnchor.x + Math.cos(angle) * dist,
            WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX,
        )
        const ty = Phaser.Math.Clamp(
            animal.herdAnchor.y + Math.sin(angle) * dist,
            WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY,
        )
        animal.wanderTarget.set(tx, ty)
        this.playAnim(animal, "walk")
    }

    private startFlee(animal: AnimalData, px: number, py: number): void {
        animal.state = "flee"
        this.updateFleeTarget(animal, px, py)

        // Calculate initial flee direction and set facing immediately
        const { sprite } = animal
        const dx = sprite.x - px
        const dy = sprite.y - py
        const newFacing = this.vecToFacing(dx, dy)
        if (newFacing !== animal.facing) {
            animal.facing = newFacing
        }

        this.playAnim(animal, "run")
    }

    private updateFleeTarget(animal: AnimalData, px: number, py: number): void {
        const { sprite } = animal
        // Direction AWAY from player
        const dx = sprite.x - px
        const dy = sprite.y - py
        const len = Math.sqrt(dx * dx + dy * dy) || 1

        // Normalize and multiply by flee distance
        const normDx = dx / len
        const normDy = dy / len

        const tx = Phaser.Math.Clamp(
            sprite.x + normDx * FLEE_DISTANCE,
            WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX,
        )
        const ty = Phaser.Math.Clamp(
            sprite.y + normDy * FLEE_DISTANCE,
            WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY,
        )
        animal.wanderTarget.set(tx, ty)
    }

    private getRunSpeed(species: AnimalSpecies): number {
        return species === "black_grouse" ? SPEED.blackGrouseWalk : SPEED.run
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — Animation helpers
    // ─────────────────────────────────────────────────────────────────────────

    private playAnim(animal: AnimalData, type: "idle" | "walk" | "run"): void {
        const key = `${animal.species}_${type}_${animal.facing}`

        // Debug logging to see what's being played
        if (ANIMAL_DEBUG && Math.random() < 0.01) {
            console.log(`Playing animation: ${key} for ${animal.species}, facing: ${animal.facing}, state: ${animal.state}`)
        }

        if (animal.sprite.anims.currentAnim?.key !== key) {
            animal.sprite.play(key, true)
        }
    }

    private vecToFacing(dx: number, dy: number): FacingDir {
        // Handle zero movement
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            return "down"
        }

        // Determine primary direction
        if (Math.abs(dx) > Math.abs(dy)) {
            // Moving horizontally
            return dx > 0 ? "right" : "left"
        } else {
            // Moving vertically
            return dy > 0 ? "down" : "up"
        }
    }

}