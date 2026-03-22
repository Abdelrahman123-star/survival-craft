
import * as Phaser from "phaser"
import { WORLD_SIZE, GRID_SIZE } from "../config/constants"

export class MapSystem {
    private scene: Phaser.Scene
    private map!: Phaser.Tilemaps.Tilemap
    private layer!: Phaser.Tilemaps.TilemapLayer
    private obstacleLayer!: Phaser.Tilemaps.TilemapLayer

    private static TILES = {
        GRASS: 1,
        DIRT: 43,
        FLOWER: 0,
        // Brown House (3x3)
        HOUSE_BROWN: [
            [48, 51, 49, 50],
            [60, 61, 63, 62],
            [72, 73, 74, 75]
        ],
        // Blue House (3x3)
        HOUSE_BLUE: [
            [52, 55, 53, 54],
            [64, 65, 67, 66],
            [72, 73, 74, 75]
        ],
        FENCE_H: 86,
        FENCE_V: 87,
        WALL: 98,
    }

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.createMap()
    }

    private createMap() {
        const width = Math.ceil(WORLD_SIZE / GRID_SIZE)
        const height = Math.ceil(WORLD_SIZE / GRID_SIZE)

        this.map = this.scene.make.tilemap({
            tileWidth: 16,
            tileHeight: 16,
            width: width,
            height: height
        })

        const tileset = this.map.addTilesetImage('tileset', 'tileset', 16, 16)
        if (!tileset) return

        this.layer = this.map.createBlankLayer('Ground', tileset)!
        this.layer.setScale(GRID_SIZE / 16)
        this.layer.setDepth(0)

        this.obstacleLayer = this.map.createBlankLayer('Obstacles', tileset)!
        this.obstacleLayer.setScale(GRID_SIZE / 16)
        this.obstacleLayer.setDepth(1)

        this.generateVillage(width, height)
        this.generateWilderness(width, height)

        this.obstacleLayer.setCollisionByExclusion([-1])
    }

    private drawStructure(x: number, y: number, layout: number[][]) {
        for (let row = 0; row < layout.length; row++) {
            for (let col = 0; col < layout[row].length; col++) {
                this.obstacleLayer.putTileAt(layout[row][col], x + col, y + row)
            }
        }
    }

    private generateVillage(w: number, h: number) {
        const cx = Math.floor(w / 2)
        const cy = Math.floor(h / 2)

        // Dirt Paths
        for (let i = -8; i <= 8; i++) {
            for (let j = -1; j <= 1; j++) {
                this.layer.putTileAt(MapSystem.TILES.DIRT, cx + i, cy + j)
                this.layer.putTileAt(MapSystem.TILES.DIRT, cx + j, cy + i)
            }
        }

        // village center dirt area
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                this.layer.putTileAt(MapSystem.TILES.DIRT, cx + i, cy + j)
            }
        }

        // Houses
        this.drawStructure(cx - 5, cy - 6, MapSystem.TILES.HOUSE_BROWN)
        this.drawStructure(cx + 2, cy - 6, MapSystem.TILES.HOUSE_BLUE)
        this.drawStructure(cx - 5, cy + 3, MapSystem.TILES.HOUSE_BLUE)
        this.drawStructure(cx + 2, cy + 3, MapSystem.TILES.HOUSE_BROWN)
    }

    private generateWilderness(w: number, h: number) {
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (!this.layer.getTileAt(x, y) && !this.obstacleLayer.getTileAt(x, y)) {
                    const val = Math.random()
                    let tileIdx = MapSystem.TILES.GRASS
                    if (val > 0.9) tileIdx = MapSystem.TILES.FLOWER
                    this.layer.putTileAt(tileIdx, x, y)
                }
            }
        }
    }

    getObstacleLayer(): Phaser.Tilemaps.TilemapLayer {
        return this.obstacleLayer
    }
}
