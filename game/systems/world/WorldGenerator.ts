import { NoiseGenerator } from "./NoiseGenerator"
import { BiomeManager, BiomeConfig, TileInfo } from "./BiomeManager"
import { Random } from "../../utils/Random"

export interface ChunkData {
    x: number
    y: number
    tiles: TileInfo[][]
    objects: { x: number, y: number, type: string, biome: string, texture?: string, frame?: number }[]
}

export class WorldGenerator {
    private elevationNoise: NoiseGenerator
    private moistureNoise: NoiseGenerator
    private seed: string
    private random: Random

    constructor(seed: string) {
        this.seed = seed
        this.elevationNoise = new NoiseGenerator(seed + "_elev")
        this.moistureNoise = new NoiseGenerator(seed + "_moist")
        this.random = new Random(seed)
    }

    public getBiomeAt(worldX: number, worldY: number): BiomeConfig {
        const elev = this.elevationNoise.fbm(worldX, worldY, 4, 0.5, 0.05)
        const moist = this.moistureNoise.fbm(worldX, worldY, 4, 0.5, 0.05)
        return BiomeManager.getBiome(elev, moist)
    }

    public generateChunk(chunkX: number, chunkY: number, chunkSize: number): ChunkData {
        const tiles: TileInfo[][] = []
        const objects: { x: number, y: number, type: string, biome: string, texture?: string, frame?: number }[] = []

        for (let x = 0; x < chunkSize; x++) {
            tiles[x] = []
            for (let y = 0; y < chunkSize; y++) {
                const worldX = chunkX * chunkSize + x
                const worldY = chunkY * chunkSize + y

                // Get noise values
                const elev = this.elevationNoise.fbm(worldX, worldY, 4, 0.5, 0.05)
                const moist = this.moistureNoise.fbm(worldX, worldY, 4, 0.5, 0.05)

                const biome = BiomeManager.getBiome(elev, moist)

                // Ground Tile
                const tileInfo = this.getDeterministicChoice(worldX, worldY, biome.tiles, "tile")
                tiles[x][y] = tileInfo || biome.tiles[0]

                // Object Spawning
                const spawnRoll = this.getDeterministicValue(worldX, worldY, "spawn")

                if (spawnRoll < biome.rockDensity) {
                    const rockType = this.getDeterministicChoice(worldX, worldY, [{ key: "rock1" }, { key: "rock2" }, { key: "rock3" }, { key: "rock4" }, { key: "rock5" }], "rock")
                    objects.push({ x: worldX, y: worldY, type: "rock", biome: biome.type, texture: rockType?.key })
                }
                else if (spawnRoll < biome.rockDensity + biome.treeDensity) {
                    const treeType = this.getDeterministicChoice(worldX, worldY, biome.treeTypes, "tree")
                    if (treeType) {
                        objects.push({ x: worldX, y: worldY, type: treeType, biome: biome.type })
                    }
                }
                else if (spawnRoll < biome.rockDensity + biome.treeDensity + biome.decorDensity) {
                    const decor = this.getDeterministicChoice(worldX, worldY, biome.decorations, "decor")
                    if (decor) {
                        objects.push({ x: worldX, y: worldY, type: "decor", biome: biome.type, texture: decor.key, frame: decor.frame })
                    }
                }
                // Entity Spawning (Animals & Monsters)
                else if (spawnRoll < biome.rockDensity + biome.treeDensity + biome.decorDensity + biome.animalPackDensity) {
                    const species = ["fox", "deer", "black_grouse", "calf", "lamb"]
                    const animalType = species[Math.floor(this.getDeterministicValue(worldX, worldY, "animal_sp") * species.length)]
                    objects.push({ x: worldX, y: worldY, type: "animal_herd", biome: biome.type, texture: animalType })
                }
                else if (spawnRoll < biome.rockDensity + biome.treeDensity + biome.decorDensity + biome.animalPackDensity + biome.monsterDensity) {
                    const monsters = ["spider", "ghost", "brute"]
                    const monsterType = monsters[Math.floor(this.getDeterministicValue(worldX, worldY, "monster_sp") * monsters.length)]
                    objects.push({ x: worldX, y: worldY, type: "monster", biome: biome.type, texture: monsterType })
                }
            }
        }

        return { x: chunkX, y: chunkY, tiles, objects }
    }

    /**
     * Determines a logical village position based on the seed.
     */
    public getVillagePosition(worldWidth: number, worldHeight: number): { x: number, y: number } {
        const rand = new Random(this.seed + "_village")
        const offsetX = rand.nextInt(-5, 6)
        const offsetY = rand.nextInt(-5, 6)

        return {
            x: Math.floor(worldWidth / 2) + offsetX,
            y: Math.floor(worldHeight / 2) + offsetY
        }
    }

    private getDeterministicValue(x: number, y: number, salt: string): number {
        const localSeed = `${this.seed}_${salt}_${x}_${y}`
        const rand = new Random(localSeed)
        return rand.next()
    }

    private getDeterministicChoice<T>(x: number, y: number, choices: T[], salt: string): T | undefined {
        if (choices.length === 0) return undefined
        const idx = Math.floor(this.getDeterministicValue(x, y, salt) * choices.length)
        return choices[idx]
    }
}
