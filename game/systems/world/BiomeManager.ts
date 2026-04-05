export type BiomeType = 'DESERT' | 'GRASSLAND' | 'FOREST'

export interface TileInfo {
    key: string
    frame?: number
}

export interface BiomeConfig {
    type: BiomeType
    tiles: TileInfo[]
    treeDensity: number
    rockDensity: number
    treeTypes: ("green" | "orange")[]
    decorations: TileInfo[]
    decorDensity: number
}

export class BiomeManager {
    public static BIOMES: Record<BiomeType, BiomeConfig> = {
        DESERT: {
            type: 'DESERT',
            tiles: [{ key: 'sand' }, { key: 'sand2' }],
            treeDensity: 0,
            decorDensity: 0.05,
            decorations: [{ key: 'cactus_big' }, { key: 'cactus_small' }, { key: 'desert_grass' }],
            rockDensity: 0.01,
            treeTypes: []
        },
        GRASSLAND: {
            type: 'GRASSLAND',
            tiles: [{ key: 'grass1' }, { key: 'grass2' }, { key: 'flowergrass' }],
            treeDensity: 0.05,
            decorDensity: 0.03,
            decorations: [{ key: 'mushroom' }, { key: 'smallflowers' }, { key: 'flowergrass' }],
            rockDensity: 0.005,
            treeTypes: ["green", "orange"]
        },
        FOREST: {
            type: 'FOREST',
            tiles: [{ key: 'grass1' }, { key: 'grass2' }], // No flowergrass in dense forest?
            treeDensity: 0.25,
            decorDensity: 0.08,
            decorations: [{ key: 'mushroom' }, { key: 'smallflowers' }],
            rockDensity: 0.002,
            treeTypes: ["green"]
        }
    }

    /**
     * Maps elevation and moisture noise to a BiomeType.
     */
    public static getBiome(elevation: number, moisture: number): BiomeConfig {
        if (moisture < 0.35) {
            return this.BIOMES.DESERT
        } else if (moisture > 0.65) {
            return this.BIOMES.FOREST
        }
        return this.BIOMES.GRASSLAND
    }
}
