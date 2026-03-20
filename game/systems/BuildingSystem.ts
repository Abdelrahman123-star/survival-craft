import * as Phaser from "phaser"
import { GRID_SIZE } from "../config/constants"
import { Player } from "../entities/Player"
import { InventoryUI } from "../ui/InventoryUI"

export class BuildingSystem {
    private scene: Phaser.Scene
    private previewSprite: Phaser.GameObjects.Sprite
    private blocksGroup: Phaser.Physics.Arcade.StaticGroup
    private blockHealthBars: Map<Phaser.GameObjects.Sprite, { bg: Phaser.GameObjects.Rectangle, fill: Phaser.GameObjects.Rectangle }> = new Map()

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.blocksGroup = scene.physics.add.staticGroup()

        // Create preview sprite
        this.previewSprite = scene.add.sprite(0, 0, "wood-planks")
            .setAlpha(0.5)
            .setDepth(5)
            .setVisible(false)
            .setScale(3)
    }

    update(player: Player, selectedItem: any) {
        if (selectedItem?.item?.id === "wood-planks" && !player.isDead) {
            this.updatePreview(player)
        } else {
            this.previewSprite.setVisible(false)
        }
        this.updateHealthBars()
    }

    private updatePreview(player: Player) {
        const reach = 60
        const targetX = player.sprite.x + player.facingDirection.x * reach
        const targetY = player.sprite.y + player.facingDirection.y * reach

        // Snap to grid
        const gx = Math.floor(targetX / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2
        const gy = Math.floor(targetY / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2

        this.previewSprite.setPosition(gx, gy)
        this.previewSprite.setVisible(true)
    }

    placeBlock(player: Player, selectedItem: any, inventoryUI: InventoryUI) {
        if (!this.previewSprite.visible || player.isDead) return

        // Final check for item
        if (selectedItem?.item?.id !== "wood-planks" || selectedItem.quantity <= 0) return

        const x = this.previewSprite.x
        const y = this.previewSprite.y

        // Check if space is occupied by another block in this group
        const occupied = this.blocksGroup.getChildren().some((child: any) => child.x === x && child.y === y)
        if (occupied) return

        // Create the block
        const block = this.blocksGroup.create(x, y, "wood-planks").setScale(3).refreshBody()
        block.setDepth(1)
        block.setData("hp", 75)
        block.setData("maxHp", 75)

        // Create health bar for the block (initially hidden)
        const barW = 30
        const barH = 4
        const bg = this.scene.add.rectangle(x, y - 24, barW, barH, 0x000000, 0.5).setDepth(2).setVisible(false)
        const fill = this.scene.add.rectangle(x - barW / 2, y - 24, barW, barH - 1, 0x22cc55, 0.8).setOrigin(0, 0.5).setDepth(2).setVisible(false)
        this.blockHealthBars.set(block, { bg, fill })

        // Consume item
        player.inventory.removeItem(inventoryUI.getSelectedHotbarIndex(), 1)
        inventoryUI.refreshUI()
    }
    damageBlock(block: Phaser.GameObjects.Sprite, amount: number) {
        if (!block || !block.active) return

        const hp = block.getData("hp") - amount
        block.setData("hp", hp)

        const bars = this.blockHealthBars.get(block)
        if (bars) {
            const maxHp = block.getData("maxHp")
            const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1)
            bars.bg.setVisible(true)
            bars.fill.setVisible(true)
            bars.fill.width = Math.floor((bars.bg.width) * ratio)

            // Color based on health
            if (ratio < 0.3) bars.fill.setFillStyle(0xff3333)
            else if (ratio < 0.6) bars.fill.setFillStyle(0xffcc33)
        }

        if (hp <= 0) {
            this.destroyBlock(block)
        }
    }

    private destroyBlock(block: Phaser.GameObjects.Sprite) {
        const bars = this.blockHealthBars.get(block)
        if (bars) {
            bars.bg.destroy()
            bars.fill.destroy()
            this.blockHealthBars.delete(block)
        }
        block.destroy()
    }
    private updateHealthBars() {
        this.blockHealthBars.forEach((bars, block) => {
            if (block.active) {
                bars.bg.setPosition(block.x, block.y - 24)
                bars.fill.setPosition(block.x - bars.bg.width / 2, block.y - 24)
            }
        })
    }

    getBlocksGroup() {
        return this.blocksGroup
    }
}
