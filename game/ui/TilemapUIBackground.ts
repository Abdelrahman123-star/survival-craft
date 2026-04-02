import * as Phaser from "phaser"

export class TilemapUIBackground {
    public container: Phaser.GameObjects.Container
    public layers: (Phaser.Tilemaps.TilemapLayer | Phaser.GameObjects.Image)[] = []
    private scene: Phaser.Scene
    private tilemap: Phaser.Tilemaps.Tilemap
    private isExternalContainer: boolean

    constructor(scene: Phaser.Scene, mapKey: string, tilesetKey: string, x: number = 0, y: number = 0, scale: number = 2.5, parentContainer?: Phaser.GameObjects.Container) {
        this.scene = scene
        this.isExternalContainer = !!parentContainer
        this.container = parentContainer || this.scene.add.container(x, y)

        // Parse the tilemap
        this.tilemap = this.scene.make.tilemap({ key: mapKey })

        const tilesetName = this.tilemap.tilesets[0]?.name || tilesetKey
        const tileset = this.tilemap.addTilesetImage(tilesetName, tilesetKey)

        if (!tileset) {
            console.warn(`TilemapUIBackground: FAILED to create tileset "${tilesetName}"`)
            return
        }

        const width = this.tilemap.widthInPixels
        const height = this.tilemap.heightInPixels

        // We will create a RenderTexture to bake the tilemap into a single image
        const rt = this.scene.add.renderTexture(0, 0, width, height).setVisible(false)

        // Draw layers one by one. 
        // Important: Create all layers first, then draw them to ensure all textures are ready.
        const createdLayers: Phaser.Tilemaps.TilemapLayer[] = []
        this.tilemap.layers.forEach((layerData) => {
            const layer = this.tilemap.createLayer(layerData.name, tileset, 0, 0)
            if (layer) {
                createdLayers.push(layer)
            }
        })

        // Batch draw them into the RenderTexture
        rt.draw(createdLayers)

        // Clean up temporary layers
        createdLayers.forEach(l => l.destroy())

        // Save as a texture and use in an Image for stability
        const textureKey = `baked_ui_${mapKey}_${Date.now()}`
        rt.saveTexture(textureKey)
        rt.destroy()

        const bakedImage = this.scene.add.image(0, 0, textureKey)
        bakedImage.setScale(scale)
        bakedImage.setPosition(0, 0)

        this.container.add(bakedImage)
        this.layers.push(bakedImage)

        console.log(`TilemapUIBackground: Baked ${createdLayers.length} layers for map "${mapKey}"`)
    }

    destroy() {
        if (!this.isExternalContainer) {
            this.container.destroy()
        }
        this.tilemap.destroy()
    }
}
