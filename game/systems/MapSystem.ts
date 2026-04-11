import * as Phaser from "phaser"
import { WORLD_SIZE, GRID_SIZE, WORLD_SEED } from "../config/constants"
import { WorldGenerator, ChunkData } from "./world/WorldGenerator"

class Chunk {
    public groundContainer: Phaser.GameObjects.Container
    public objects: Phaser.GameObjects.GameObject[] = []
    public data: ChunkData

    constructor(
        scene: Phaser.Scene,
        cx: number,
        cy: number,
        size: number,
        worldGen: WorldGenerator,
        obstacleGroup: Phaser.Physics.Arcade.StaticGroup
    ) {
        this.data = worldGen.generateChunk(cx, cy, size)

        const worldX = cx * size * GRID_SIZE
        const worldY = cy * size * GRID_SIZE

        // Use a container for the ground layer 
        // This is extremely simple and avoids any Tilemap complexity or crashes!
        this.groundContainer = scene.add.container(0, 0).setDepth(0)

        // Spawn Ground Tiles
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const tileInfo = this.data.tiles[x][y]
                const px = (cx * size + x) * GRID_SIZE + GRID_SIZE / 2
                const py = (cy * size + y) * GRID_SIZE + GRID_SIZE / 2

                const tileImg = scene.add.sprite(px, py, tileInfo.key, tileInfo.frame)
                const scale = GRID_SIZE / (tileImg.width || 16)
                tileImg.setScale(scale)

                this.groundContainer.add(tileImg)
            }
        }

        // Spawn Objects (Rocks, Cacti, Decorations)
        this.data.objects.forEach(obj => {
            // Trees and Rocks and Entities are handled by their respective systems
            if (obj.type === "green" || obj.type === "orange" || obj.type === "rock" ||
                obj.type === "monster" || obj.type === "animal_herd") return

            const rx = obj.x * GRID_SIZE + GRID_SIZE / 2
            const ry = obj.y * GRID_SIZE + GRID_SIZE / 2

            const sprite = scene.add.sprite(rx, ry, obj.texture || 'tileset-atlas', obj.frame)
                .setDepth(1)

            const scale = GRID_SIZE / (sprite.width || 16)
            sprite.setScale(scale)

            this.objects.push(sprite)
        })
    }

    public destroy() {
        this.groundContainer.list.forEach(child => child.destroy())
        this.groundContainer.destroy()
        this.objects.forEach(obj => obj.destroy())
        this.objects = []
    }
}

export class MapSystem {
    private scene: Phaser.Scene
    private chunks: Map<string, Chunk> = new Map()
    public worldGen: WorldGenerator
    private obstacleGroup: Phaser.Physics.Arcade.StaticGroup

    public readonly CHUNK_SIZE = 16
    private readonly RENDER_RADIUS = 2

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.worldGen = new WorldGenerator(WORLD_SEED)
        this.obstacleGroup = scene.physics.add.staticGroup()

        this.update(0, 0)
    }

    public update(playerX: number, playerY: number) {
        const pChunkX = Math.floor(playerX / (this.CHUNK_SIZE * GRID_SIZE))
        const pChunkY = Math.floor(playerY / (this.CHUNK_SIZE * GRID_SIZE))

        // 1. Load missing chunks around player
        for (let x = pChunkX - this.RENDER_RADIUS; x <= pChunkX + this.RENDER_RADIUS; x++) {
            for (let y = pChunkY - this.RENDER_RADIUS; y <= pChunkY + this.RENDER_RADIUS; y++) {
                const key = `${x},${y}`
                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(this.scene, x, y, this.CHUNK_SIZE, this.worldGen, this.obstacleGroup)
                    this.chunks.set(key, chunk)

                    // Notify all systems that a chunk is loaded
                    this.scene.events.emit('chunkLoaded', chunk.data)
                }
            }
        }

        // 2. Unload distant chunks
        for (const [key, chunk] of this.chunks.entries()) {
            const [cx, cy] = key.split(',').map(Number)
            const dist = Math.max(Math.abs(cx - pChunkX), Math.abs(cy - pChunkY))

            // Unload if outside render radius + a small buffer to prevent rapid swapping
            if (dist > this.RENDER_RADIUS + 1) {
                chunk.destroy()
                this.chunks.delete(key)
                this.scene.events.emit('chunkUnloaded', key, cx, cy)
            }
        }
    }

    public addCollider(object: any, callback?: Function) {
        this.scene.physics.add.collider(object, this.obstacleGroup, callback as any)
    }

    public getObstacleGroup(): Phaser.Physics.Arcade.StaticGroup {
        return this.obstacleGroup
    }

    public getWorldData(): ChunkData {
        return this.chunks.get("0,0")?.data || this.worldGen.generateChunk(0, 0, this.CHUNK_SIZE)
    }

    public getBiomeAt(px: number, py: number): string {
        const gx = Math.floor(px / GRID_SIZE)
        const gy = Math.floor(py / GRID_SIZE)
        return this.worldGen.getBiomeAt(gx, gy).type
    }

    public getLoadedChunkCount(): number {
        return this.chunks.size
    }
}
