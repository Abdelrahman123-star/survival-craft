import * as Phaser from "phaser"

export class Villager {
    public sprite: Phaser.Physics.Arcade.Sprite
    private marker: Phaser.GameObjects.Sprite
    private label: Phaser.GameObjects.Text
    public id: string

    constructor(scene: Phaser.Scene, x: number, y: number, id: string, name: string, texture: string) {
        this.id = id
        this.sprite = scene.physics.add.sprite(x, y, texture)
            .setScale(3)
            .setDepth(1)
            .setImmovable(true)

        // Name label
        this.label = scene.add.text(x, y - 60, name, {
            fontFamily: "Alagard",
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#00000088",
            padding: { x: 5, y: 2 }
        }).setOrigin(0.5).setDepth(2)

        // Quest marker
        this.marker = scene.add.sprite(x, y - 90, "quest-available")
            .setScale(2)
            .setDepth(2)
            .setVisible(false)
    }

    public updateMarker(status: 'available' | 'active' | 'none') {
        if (status === 'none') {
            this.marker.setVisible(false)
        } else {
            this.marker.setVisible(true)
            this.marker.setTexture(status === 'available' ? 'quest-available' : 'quest-active')
        }
    }

    public get x() { return this.sprite.x }
    public get y() { return this.sprite.y }
}
