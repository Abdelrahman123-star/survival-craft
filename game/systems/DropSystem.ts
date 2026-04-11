import * as Phaser from "phaser"
import { Item, Inventory } from "../entities/Inventory"
import { Player } from "../entities/Player"

export interface DroppedItemEntity {
    sprite: Phaser.Physics.Arcade.Sprite
    item: Item
    quantity: number
    dropTime: number
}

export class DropSystem {
    private scene: Phaser.Scene
    private droppedItems: DroppedItemEntity[] = []
    private pickupRange: number = 60
    private pickupDelay: number = 1000 // 1 second delay before pickup

    constructor(scene: Phaser.Scene) {
        this.scene = scene
    }

    /**
     * Spawns an item on the ground with an animation from player to target.
     */
    spawnDroppedItem(item: Item, quantity: number, startX: number, startY: number, targetX?: number, targetY?: number) {
        // If no target provided, drop slightly ahead or at same spot
        const tx = targetX ?? startX
        const ty = targetY ?? startY

        // Dynamic scaling based on texture size to keep items roughly same size on ground
        const texture = this.scene.textures.get(item.icon)
        const frame = texture.getSourceImage()
        const width = (frame as any).width || 16
        const targetScale = width > 20 ? 1.5 : 3 // 32x32 items get 1.5x, 16x16 get 3x

        const sprite = this.scene.physics.add.sprite(startX, startY, item.icon)
            .setScale(0)
            .setAlpha(0)
            .setDepth(0.5)

        // Drop animation (fly from player to target)
        this.scene.tweens.add({
            targets: sprite,
            x: tx,
            y: ty,
            scale: targetScale,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Add a gentle hover animation after landing
                this.scene.tweens.add({
                    targets: sprite,
                    y: ty - 10,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                })

                this.scene.tweens.add({
                    targets: sprite,
                    angle: { from: -5, to: 5 },
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                })
            }
        })

        this.droppedItems.push({
            sprite,
            item,
            quantity,
            dropTime: this.scene.time.now
        })

        return sprite
    }

    update(player: Player) {
        const now = this.scene.time.now
        const px = player.sprite.x
        const py = player.sprite.y

        // Filter out items that are picked up
        this.droppedItems = this.droppedItems.filter(entity => {
            // Check if enough time has passed to pick up
            if (now - entity.dropTime < this.pickupDelay) {
                return true
            }

            const dist = Phaser.Math.Distance.Between(px, py, entity.sprite.x, entity.sprite.y)

            if (dist < this.pickupRange) {
                // Try to add to inventory
                const success = player.inventory.addItem(entity.item, entity.quantity)

                if (success) {
                    // Visual feedback for pickup
                    this.scene.tweens.add({
                        targets: entity.sprite,
                        x: px,
                        y: py,
                        scale: 0,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => {
                            entity.sprite.destroy()
                        }
                    })

                    // Trigger UI refresh if possible (using events or callback)
                    this.scene.events.emit('itemPickedUp')
                    return false // Remove from list
                }
            }

            return true
        })
    }

    /**
     * Clean up all dropped items (e.g. on scene restart)
     */
    cleanup() {
        this.droppedItems.forEach(e => e.sprite.destroy())
        this.droppedItems = []
    }

    getDroppedItemCount(): number {
        return this.droppedItems.length
    }
}
