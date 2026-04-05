import { ROCK_INTERACT_RADIUS, GRID_SIZE, ROCK_MAX_HP } from "../config/constants"
import { ChunkData } from "./world/WorldGenerator"
import { ITEMS } from "../config/items"
import { Player } from "../entities/Player"

export class MiningSystem {
    private rocks: Phaser.GameObjects.Group
    private scene: Phaser.Scene
    private chunkRocks: Map<string, Phaser.GameObjects.Sprite[]> = new Map()

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.rocks = scene.add.group()
    }

    public onChunkLoaded(data: ChunkData) {
        const key = `${data.x},${data.y}`
        if (this.chunkRocks.has(key)) return
        if (!this.rocks.active || !this.scene.scene.isActive(this.scene.scene.key)) return

        const rocksInChunk: Phaser.GameObjects.Sprite[] = []
        data.objects.forEach(obj => {
            if (obj.type === "rock") {
                const rock = this.createRock(obj.x * GRID_SIZE, obj.y * GRID_SIZE, obj.texture || 'tileset-atlas', obj.frame)
                if (rock) rocksInChunk.push(rock)
            }
        })
        this.chunkRocks.set(key, rocksInChunk)
    }

    public onChunkUnloaded(key: string) {
        const rocksInChunk = this.chunkRocks.get(key)
        if (rocksInChunk) {
            rocksInChunk.forEach(rock => {
                this.rocks.remove(rock)
                rock.destroy()
            })
            this.chunkRocks.delete(key)
        }
    }

    private createRock(x: number, y: number, texture: string, frame?: string | number): Phaser.GameObjects.Sprite | undefined {
        if (!this.rocks.active) return undefined

        const rx = x + GRID_SIZE / 2
        const ry = y + GRID_SIZE / 2

        const sprite = this.scene.add.sprite(rx, ry, texture, frame)
            .setDepth(1)
            .setData('hp', ROCK_MAX_HP)

        const scale = 2 * (GRID_SIZE / (sprite.width || 16))
        sprite.setScale(scale)

        this.rocks.add(sprite)
        this.scene.physics.add.existing(sprite)
        const body = sprite.body as Phaser.Physics.Arcade.Body
        body.setImmovable(true)

        // Use a smaller circle for collision, centered on the rock base
        const radius = (GRID_SIZE * 0.4)
        body.setCircle(radius / sprite.scaleX,
            (sprite.width / 2) - (radius / sprite.scaleX),
            (sprite.height / 2) - (radius / sprite.scaleX)
        )

        return sprite
    }

    public getNearbyRock(playerX: number, playerY: number, radius: number = ROCK_INTERACT_RADIUS): Phaser.GameObjects.Sprite | undefined {
        return this.rocks.getChildren().find((go) => {
            const rock = go as Phaser.GameObjects.Sprite
            const dx = playerX - rock.x
            const dy = playerY - rock.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            return distance < radius
        }) as Phaser.GameObjects.Sprite | undefined
    }

    public mineRock(rock: Phaser.GameObjects.Sprite, power: number): boolean {
        const currentHp = rock.getData('hp') - power
        rock.setData('hp', currentHp)

        // Visual feedback: shake the rock
        this.scene.tweens.add({
            targets: rock,
            x: rock.x + 2,
            duration: 50,
            yoyo: true,
            repeat: 1
        })

        // Particle effect for debris
        this.createDebris(rock.x, rock.y)

        if (currentHp <= 0) {
            this.rocks.remove(rock)
            if (rock.body) (rock.body as Phaser.Physics.Arcade.Body).setEnable(false)

            // Destruction animation: SHATTER!
            this.scene.tweens.add({
                targets: rock,
                scale: 0,
                alpha: 0,
                angle: 45,
                duration: 300,
                ease: "Back.easeIn",
                onComplete: () => {
                    rock.destroy()
                }
            })
        }

        return currentHp <= 0
    }

    private createDebris(x: number, y: number) {
        for (let i = 0; i < 5; i++) {
            const debris = this.scene.add.circle(
                x + Phaser.Math.Between(-15, 15),
                y + Phaser.Math.Between(-15, 15),
                Phaser.Math.Between(2, 4),
                0x888888
            ).setDepth(20)

            this.scene.tweens.add({
                targets: debris,
                x: debris.x + Phaser.Math.Between(-40, 40),
                y: debris.y + Phaser.Math.Between(-40, 40),
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(400, 700),
                ease: "Power2",
                onComplete: () => debris.destroy()
            })
        }
    }

    public getRocksGroup(): Phaser.GameObjects.Group {
        return this.rocks
    }
}
