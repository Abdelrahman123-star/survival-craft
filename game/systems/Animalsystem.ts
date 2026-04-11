import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { WORLD_SIZE, GRID_SIZE } from "../config/constants"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS  — tweak anything here without touching logic
// ─────────────────────────────────────────────────────────────────────────────

/** Set to true to log debug info and spawn animals near the player start */
const ANIMAL_DEBUG = false

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

const WORLD_PX = WORLD_SIZE * GRID_SIZE
const WORLD_BOUNDS = {
    minX: -1000000,
    minY: -1000000,
    maxX: 1000000,
    maxY: 1000000,
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

    // Fox Hurt & Death
    { key: "fox_hurt", path: "/assets/animals/Fox/Fox_Hurt_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },
    { key: "fox_death", path: "/assets/animals/Fox/Fox_Death_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },

    // Deer Hurt & Death
    { key: "deer_hurt", path: "/assets/animals/Deer/Deer_Hurt_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },
    { key: "deer_death", path: "/assets/animals/Deer/Deer_Death_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },

    // Black Grouse Hurt & Death
    { key: "black_grouse_hurt", path: "/assets/animals/Black_grouse/Black_grouse_Hurt_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },
    { key: "black_grouse_death", path: "/assets/animals/Black_grouse/Black_grouse_Death_with_shadow.png", frameWidth: 32, frameHeight: 32, cols: 4, rows: 4 },
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

    // ── Generic Hurt/Death (4 cols, 4 rows) ────────────────────────────────
    const addHurtDeath = (species: string) => {
        if (species === "calf" || species === "lamb") return // No sheets provided for these yet
        dirs.forEach((dir) => {
            const row = DIR_ROW[dir]
            // Hurt
            defs.push({
                key: `${species}_hurt_${dir}`,
                sheet: `${species}_hurt`,
                startFrame: frameIndex(row, 0, 4),
                frameCount: 4,
                frameRate: 10,
                repeat: 0, // Play once
            })
            // Death
            defs.push({
                key: `${species}_death_${dir}`,
                sheet: `${species}_death`,
                startFrame: frameIndex(row, 0, 4),
                frameCount: 4,
                frameRate: 8,
                repeat: 0, // Play once
            })
        })
    }

    addHurtDeath("fox")
    addHurtDeath("deer")
    addHurtDeath("black_grouse")

    return defs
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

type AnimalState = "idle" | "wander" | "flee" | "post_flee" | "hurt" | "death"

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
    hp: number
    maxHp: number
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export class AnimalSystem {
    private scene: Phaser.Scene
    private animals: AnimalData[] = []
    private group!: Phaser.Physics.Arcade.Group
    private chunkAnimals: Map<string, AnimalData[]> = new Map()
    public onAnimalDeath?: (species: AnimalSpecies, x: number, y: number) => void

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
    }

    public onChunkLoaded(data: any): void {
        const key = `${data.x},${data.y}`
        if (this.chunkAnimals.has(key)) return

        const animalsInChunk: AnimalData[] = []
        data.objects.forEach((obj: any) => {
            if (obj.type === "animal_herd") {
                const sp = obj.texture as AnimalSpecies
                const ax = obj.x * GRID_SIZE + GRID_SIZE / 2
                const ay = obj.y * GRID_SIZE + GRID_SIZE / 2
                const anchor = new Phaser.Math.Vector2(ax, ay)

                // Spawn a small herd around the anchor
                const size = Phaser.Math.Between(HERD_SIZE.min, HERD_SIZE.max)
                for (let i = 0; i < size; i++) {
                    const offsetX = Phaser.Math.Between(-60, 60)
                    const offsetY = Phaser.Math.Between(-60, 60)
                    const animal = this.spawnAnimal(sp, ax + offsetX, ay + offsetY, anchor)
                    animalsInChunk.push(animal)
                }
            }
        })
        this.chunkAnimals.set(key, animalsInChunk)
    }

    public onChunkUnloaded(key: string): void {
        const animalsInChunk = this.chunkAnimals.get(key)
        if (animalsInChunk) {
            animalsInChunk.forEach(animal => {
                this.destroyAnimal(animal)
                this.animals = this.animals.filter(a => a !== animal)
            })
            this.chunkAnimals.delete(key)
        }
    }

    // ── Called from MainScene.update() ───────────────────────────────────────
    update(player: Player, delta: number): void {
        const px = player.sprite.x
        const py = player.sprite.y

        // Update active animals only
        for (const animal of this.animals) {
            this.updateAnimal(animal, px, py, delta)
        }
    }

    getGroup(): Phaser.Physics.Arcade.Group {
        return this.group
    }

    getAnimalsInRange(x: number, y: number, range: number): Phaser.Physics.Arcade.Sprite[] {
        return this.animals
            .filter(a => a.isActive && a.state !== "death")
            .filter(a => {
                const dist = Phaser.Math.Distance.Between(x, y, a.sprite.x, a.sprite.y)
                return dist <= range
            })
            .map(a => a.sprite)
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

    private getIdleSheet(species: AnimalSpecies): string {
        switch (species) {
            case "fox": return "fox_idle"
            case "deer": return "deer_idle"
            case "black_grouse": return "black_grouse_idle"
            case "calf": return "calf_combined"
            case "lamb": return "lamb_combined"
        }
    }

    private spawnAnimal(
        species: AnimalSpecies,
        x: number,
        y: number,
        herdAnchor: Phaser.Math.Vector2,
    ): AnimalData {
        const idleSheet = this.getIdleSheet(species)
        const sprite = this.scene.physics.add.sprite(x, y, idleSheet)
        sprite.setCollideWorldBounds(false)
        sprite.setDepth(5)
        sprite.setScale(ANIMAL_SCALE)
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
            isActive: true,
            hp: 10,
            maxHp: 10,
        }

        this.playAnim(animal, "idle")
        this.animals.push(animal)
        return animal
    }

    private destroyAnimal(animal: AnimalData): void {
        this.group.remove(animal.sprite)
        animal.sprite.destroy()
        animal.isActive = false
    }

    // ── Animal Combat ──
    damageAnimal(animalSprite: Phaser.Physics.Arcade.Sprite, damage: number): boolean {
        const animal = this.animals.find(a => a.sprite === animalSprite && a.isActive)
        if (!animal || animal.state === "death") return false

        animal.hp -= damage
        if (animal.hp <= 0) {
            this.startDeath(animal)
        } else {
            this.startHurt(animal)
        }
        return true
    }

    private startHurt(animal: AnimalData): void {
        animal.state = "hurt"
        this.stopMovement(animal)

        const animKey = `${animal.species}_hurt_${animal.facing}`
        const hasAnim = this.scene.anims.exists(animKey)

        const onComplete = () => {
            if (animal.state === "hurt") {
                // Always flee after being hurt if player is around
                const playerSprite = (this.scene as any).player?.sprite
                if (playerSprite) {
                    this.startFlee(animal, playerSprite.x, playerSprite.y)
                } else {
                    animal.state = "idle"
                    animal.wanderTimer = 500
                }
            }
        }

        if (hasAnim) {
            this.playAnim(animal, "hurt")
            animal.sprite.once('animationcomplete', onComplete)
        } else {
            // Tween fallback: red flash
            this.scene.tweens.add({
                targets: animal.sprite,
                tint: 0xff0000,
                duration: 100,
                yoyo: true,
                onComplete: onComplete
            })
        }
    }

    private startDeath(animal: AnimalData): void {
        animal.state = "death"
        this.stopMovement(animal)

        const animKey = `${animal.species}_death_${animal.facing}`
        const hasAnim = this.scene.anims.exists(animKey)

        const onComplete = () => {
            if (this.onAnimalDeath) {
                this.onAnimalDeath(animal.species, animal.sprite.x, animal.sprite.y)
            }
            this.destroyAnimal(animal)
            this.animals = this.animals.filter(a => a !== animal)
        }

        if (hasAnim) {
            this.playAnim(animal, "death")
            animal.sprite.once('animationcomplete', onComplete)
        } else {
            // Tween fallback: drop and fade
            this.scene.tweens.add({
                targets: animal.sprite,
                angle: 90,
                alpha: 0,
                y: animal.sprite.y + 20,
                duration: 500,
                onComplete: onComplete
            })
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

            // ── HURT / DEATH ────────────────────────────────────────────────────
            case "hurt":
            case "death":
                // Logic handled by animation callbacks
                break
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

    private playAnim(animal: AnimalData, type: "idle" | "walk" | "run" | "hurt" | "death"): void {
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