import * as Phaser from "phaser"
import { UIManager } from "../ui/UIManager"
import { TreeSystem } from "../systems/TreeSystem"
import { HUD } from "../ui/HUD"
import { QuestSystem } from "../systems/QuestSystem"
import { CombatSystem } from "../systems/CombatSystem"
import { MonsterSystem } from "../systems/MonsterSystem"
import { MiningSystem } from "../systems/MiningSystem"
import { PLAYER_SPEED, WORLD_SIZE, GRID_SIZE } from "../config/constants"
import { ITEMS } from "../config/items"
import { LOOT_TABLES } from "../config/loot"
import { InventoryUI } from "../ui/InventoryUI"
import { MerchantSystem } from "../systems/MerchantSystem"
import { CraftingSystem } from "../systems/CraftingSystem"
import { CraftingUI } from "../ui/CraftingUI"

import { BuildingSystem } from "../systems/BuildingSystem"
import { MapSystem } from "../systems/MapSystem"
import { VillagerSystem } from "../systems/VillagerSystem"
import { QuestUI } from "../ui/QuestUI"
import { Player } from "../entities/Player"

import { DayNightSystem } from "../systems/Daynightsystem"
import { WorldOverlay } from "../systems/WorldOverlay"
import { DayNightHUD } from "../ui/DayNightHUD"
import { NightSpawnController } from "../systems/NightSpawnController"
import { DropSystem } from "../systems/DropSystem"
import { HAND_CHOPPING_POWER, HAND_MINING_POWER } from "../config/constants"
import { DebugSystem } from "../systems/DebugSystem"

import { IMAGE_ASSETS } from "../config/assets"
// Animal System
import { AnimalSystem } from "../systems/Animalsystem"

export default class MainScene extends Phaser.Scene {
    private treeSystem!: TreeSystem
    private miningSystem!: MiningSystem
    private hud!: HUD
    private inventoryUI!: InventoryUI
    private questSystem!: QuestSystem
    private combatSystem!: CombatSystem
    private monsterSystem!: MonsterSystem
    private merchantSystem!: MerchantSystem
    private craftingSystem!: CraftingSystem
    private craftingUI!: CraftingUI

    private buildingSystem!: BuildingSystem
    private mapSystem!: MapSystem
    private villagerSystem!: VillagerSystem
    private questUI!: QuestUI
    private player!: Player
    private uiManager!: UIManager
    private keys!: Record<string, Phaser.Input.Keyboard.Key>
    private interactKey!: Phaser.Input.Keyboard.Key
    private attackKey!: Phaser.Input.Keyboard.Key
    private inventoryKey!: Phaser.Input.Keyboard.Key
    private isTeleportingToBoss = false
    private villager!: Phaser.Physics.Arcade.Sprite

    private readonly villagerSpawn = { x: 700, y: 1050 }

    private dayNightSystem!: DayNightSystem
    private worldOverlay!: WorldOverlay
    private dayNightHUD!: DayNightHUD
    private nightSpawnController!: NightSpawnController
    private dropSystem!: DropSystem
    private dropKey!: Phaser.Input.Keyboard.Key
    private debugSystem!: DebugSystem
    // Animal System
    private animalSystem!: AnimalSystem

    constructor() { super("MainScene") }

    preload() {


        document.fonts.load('16px Alagard')
        this.load.spritesheet("player", "/assets/Charachter Animation/CharachterAnimation.png", { frameWidth: 48, frameHeight: 48 })
        const assets: Record<string, string> = IMAGE_ASSETS

        Object.entries(assets).forEach(([k, v]) => this.load.image(k, v))
        this.load.spritesheet("tileset", "/assets/tileset.png", { frameWidth: 16, frameHeight: 16 })
        this.load.image("craftTiles", "/assets/ui/crafting-ui/craftTiles.png")
        this.load.tilemapTiledJSON("craft-tilemap", "/assets/ui/crafting-ui/craft-tilemap.json")
        this.load.image("inventory-tilemap", "/assets/ui/inventory/inventoryTilemap.png")
        this.load.tilemapTiledJSON("inventory-map", "/assets/ui/inventory/inventoryMap.json")
        // Animal System
        this.animalSystem = new AnimalSystem(this)
        this.animalSystem.preload()
    }

    create() {
        window.addEventListener("contextmenu", (e) => e.preventDefault())
        this.game.canvas.oncontextmenu = () => false
        this.setupControls()

        this.treeSystem = new TreeSystem(this)
        this.miningSystem = new MiningSystem(this)
        this.mapSystem = new MapSystem(this)

        const chunkLoadedListener = (data: any) => {
            this.treeSystem.onChunkLoaded(data)
            this.miningSystem.onChunkLoaded(data)
        }
        const chunkUnloadedListener = (key: string) => {
            this.treeSystem.onChunkUnloaded(key)
            this.miningSystem.onChunkUnloaded(key)
        }

        this.events.on('chunkLoaded', chunkLoadedListener)
        this.events.on('chunkUnloaded', chunkUnloadedListener)
        this.events.once('shutdown', () => {
            this.events.off('chunkLoaded', chunkLoadedListener)
            this.events.off('chunkUnloaded', chunkUnloadedListener)
        })

        const villagePos = this.mapGenVillagePos()
        this.player = new Player(this, villagePos.x, villagePos.y)
        this.setupCamera()
        // Register initial colliders
        this.mapSystem.addCollider(this.player.sprite)
        this.physics.add.collider(this.player.sprite, this.miningSystem.getRocksGroup())
        // this.mapSystem.addCollider(this.villager)
        this.monsterSystem = new MonsterSystem(this)
        // this.questSystem = new QuestSystem(this, WORLD_SEED)
        this.monsterSystem.onMonsterDeath = (type, x, y) => {
            const xpValues: Record<string, number> = { spider: 20, ghost: 40, brute: 60 }
            const xp = xpValues[type] || 10
            this.player.addXp(xp)
            // this.questSystem.updateProgress("kill", type, 1, this.player)
            // this.hud.update(this.player, this.questSystem)
            this.hud.update(this.player, undefined as any)
            // Drop loot
            const lootTable = LOOT_TABLES[type]
            if (lootTable) {
                lootTable.forEach(entry => {
                    if (Math.random() < entry.chance) {
                        const quantity = Phaser.Math.Between(entry.min, entry.max)
                        // Drop in a random direction slightly away from center
                        const angle = Math.random() * Math.PI * 2
                        const dist = Math.random() * 30
                        const dx = Math.cos(angle) * dist
                        const dy = Math.sin(angle) * dist
                        this.dropSystem.spawnDroppedItem(ITEMS[entry.itemId], quantity, x, y, x + dx, y + dy)
                    }
                })
            }
        }
        this.combatSystem = new CombatSystem(this, this.monsterSystem)
        this.hud = new HUD(this)
        this.uiManager = new UIManager()
        this.inventoryUI = new InventoryUI(this, this.player.inventory, this.player)
        const vPos = this.mapGenVillagePos()
        // this.merchantSystem = new MerchantSystem(this, vPos.x, vPos.y - 150, this.player, this.inventoryUI)
        this.craftingSystem = new CraftingSystem()
        this.craftingUI = new CraftingUI(this)

        this.uiManager.registerUI("inventory", this.inventoryUI)
        this.uiManager.registerUI("crafting", this.craftingUI)


        this.buildingSystem = new BuildingSystem(this)
        // Quest UI and Villager System (Commented out)
        /*
        this.questUI = new QuestUI(this)
        this.villagerSystem = new VillagerSystem(this, this.questSystem, this.questUI, WORLD_SEED, vPos)
        this.uiManager.registerUI("quest", this.questUI)
        this.mapSystem.addCollider(this.villagerSystem.getVillagerGroup())
        this.physics.add.collider(this.villager, this.villagerSystem.getVillagerGroup())
        */
        // Add colliders for monsters
        this.mapSystem.addCollider(this.monsterSystem.getMonsterGroup())

        this.physics.add.collider(this.player.sprite, this.buildingSystem.getBlocksGroup())
        this.physics.add.collider(this.monsterSystem.getMonsterGroup(), this.buildingSystem.getBlocksGroup(), (m, b) => {
            const monster = this.monsterSystem.getMonsterAt(m as Phaser.Physics.Arcade.Sprite)
            if (monster && monster.isActive()) {
                this.buildingSystem.damageBlock(b as Phaser.GameObjects.Sprite, monster.getDamage() * 0.1)
            }
        })

        this.physics.add.overlap(this.player.sprite, this.monsterSystem.getMonsterGroup(), (p, m) => {
            // Collision is now handled by the monster's attack windup in update()
        })


        this.dayNightSystem = new DayNightSystem(this)
        this.worldOverlay = new WorldOverlay(this)
        this.dayNightHUD = new DayNightHUD(this)
        this.nightSpawnController = new NightSpawnController(this.monsterSystem)



        this.dayNightSystem.onPhaseChange((phase) => {
            this.nightSpawnController.onPhaseChange(phase)
        })

        this.dropSystem = new DropSystem(this)
        this.events.on('itemPickedUp', () => {
            this.inventoryUI.refreshUI()
            this.hud.update(this.player, this.questSystem)
        })

        this.events.on('itemDroppedOutside', (data: { item: any, quantity: number }) => {
            const dropDistance = 40
            const tx = this.player.sprite.x + this.player.facingDirection.x * dropDistance
            const ty = this.player.sprite.y + this.player.facingDirection.y * dropDistance
            this.dropSystem.spawnDroppedItem(data.item, data.quantity, this.player.sprite.x, this.player.sprite.y, tx, ty)
        })

        this.setupDebugSystem()
        // animal system
        this.animalSystem.create()

    }

    private setupDebugSystem() {
        this.debugSystem = new DebugSystem(this)

        this.events.on('debugGiveItem', (data: { itemId: string, quantity: number }) => {
            if (ITEMS[data.itemId]) {
                this.player.inventory.addItem(ITEMS[data.itemId], data.quantity)
                this.inventoryUI.refreshUI()
            }
        })

        this.events.on('debugSetTime', (time: number) => {
            this.dayNightSystem.setCycleProgress(time)
        })

        this.events.on('debugSpawnMonster', (data: { type: string, x?: number, y?: number }) => {
            this.monsterSystem.spawnMonster(data.type as any, data.x, data.y)
        })

        this.events.on('debugCompleteAllQuests', () => {
            if (this.questSystem) {
                this.questSystem.completeAllQuests()
            }
        })

        this.events.on('debugGetPlayerState', () => {
            console.log("Player State:", {
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                level: this.player.level,
                xp: this.player.xp,
                pos: { x: this.player.sprite.x, y: this.player.sprite.y }
            })
        })

        this.events.on('debugTeleportTo', (data: { x: number, y: number }) => {
            this.player.sprite.setPosition(data.x, data.y)
        })

        this.events.on('debugGodMode', (enabled: boolean) => {
            this.combatSystem.setGodMode(enabled)
        })

        this.events.on('debugUnlimitedResources', (enabled: boolean) => {
            // This is a flag that can be checked by other systems if needed
            console.log(`Unlimited Resources: ${enabled}`)
        })

        this.events.on('debugToggleCollisionBoxes', (show: boolean) => {
            this.physics.world.drawDebug = show
            if (show) {
                this.physics.world.createDebugGraphic()
            } else {
                this.physics.world.debugGraphic?.clear()
            }
        })

        this.events.on('debugDisableDayNight', (disabled: boolean) => {
            // Handled by DayNightSystem update skip if needed, 
            // but for now we just log it or set a flag
            console.log(`Day/Night Disabled: ${disabled}`)
        })

        this.events.on('debugRefreshUI', () => {
            this.inventoryUI.refreshUI()
            this.hud.update(this.player, this.questSystem)
        })
    }

    update() {


        this.mapSystem.update(this.player.sprite.x, this.player.sprite.y)

        this.player.updateMovement(this.keys, PLAYER_SPEED)
        this.player.updateWeaponFollow()
        this.monsterSystem.update(this.player, (damage) => {
            if (this.player.isDead) return
            if (this.combatSystem.applyMonsterDamage(this.player, damage)) {
                this.player.playDeathAnimation(() => this.scene.restart())
            }
        })
        // this.hud.update(this.player, this.questSystem)
        this.hud.update(this.player, undefined as any)

        this.uiManager.update()
        // this.merchantSystem.update()
        this.buildingSystem.update(this.player, this.inventoryUI.getSelectedHotbarItem())
        // this.villagerSystem.update()

        this.handleInteraction()
        this.handleCombat()
        this.handleDrop()
        this.setupInventoryToggle()

        this.dropSystem.update(this.player)

        const dayNightState = this.dayNightSystem.update(this.game.loop.delta)
        this.worldOverlay.update(dayNightState, this.game.loop.delta)
        this.dayNightHUD.update(dayNightState)

        this.debugSystem.update(this.player, this.dayNightSystem, this.monsterSystem)
        // animal system
        this.animalSystem.update(this.player, this.game.loop.delta)

    }
    private setupCamera() {
        this.cameras.main.startFollow(this.player.sprite)
        // Removed bounds to allow infinite exploration
    }
    private setupControls() {
        this.keys = this.input.keyboard!.addKeys({ up: "W", down: "S", left: "A", right: "D" }) as any
        this.interactKey = this.input.keyboard!.addKey("E")
        this.attackKey = this.input.keyboard!.addKey("SPACE")
        this.inventoryKey = this.input.keyboard!.addKey("I")
        this.dropKey = this.input.keyboard!.addKey("Q")
    }
    private handleInteraction() {
        // if (this.questUI.isOpenNow()) return
        if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return

        /*
        const distanceToVillager = Phaser.Math.Distance.Between(
            this.player.sprite.x,
            this.player.sprite.y,
            this.villager.x,
            this.villager.y
        )
        if (distanceToVillager < 90) {
            this.startBossTeleportDialogue()
            return
        }
    
        // Prioritize Villager Interaction
        if (this.villagerSystem.handleInteraction(this.player)) {
            return
        }
    
        if (this.merchantSystem.isPlayerInRange(this.player.sprite.x, this.player.sprite.y)) {
            this.merchantSystem.toggle(this.player)
            return
        }
        */
        let foundTable = false
        this.buildingSystem.getBlocksGroup().getChildren().forEach((block: any) => {
            if (block.getData("itemId") === "crafting-table") {
                const dx = this.player.sprite.x - block.x
                const dy = this.player.sprite.y - block.y
                if (Math.sqrt(dx * dx + dy * dy) < 80) {
                    foundTable = true
                }
            }
        })

        if (foundTable) {
            if (this.craftingUI.isOpenNow()) this.craftingUI.hide()
            else {
                this.craftingUI.show(this.player, this.craftingSystem)
            }
            return
        }
        const nearbyTree = this.treeSystem.getNearbyTree(this.player.sprite.x, this.player.sprite.y)
        if (nearbyTree && /*!this.merchantSystem.isOpenNow() &&*/ !this.craftingUI.isOpenNow()) {
            const equipped = this.inventoryUI.getSelectedHotbarItem()
            const isAxe = equipped?.item?.id.toLowerCase().includes('axe')
            const power = equipped?.item?.properties?.choppingPower ?? HAND_CHOPPING_POWER

            const destroyed = this.treeSystem.chopTree(nearbyTree, power)
            this.player.playChoppingAnimation(!!isAxe)

            if (destroyed) {
                this.player.inventory.addItem(ITEMS["wood"], 1)
                this.player.addXp(10)
                this.inventoryUI.refreshUI()
                this.hud.update(this.player, undefined as any)
            }
            return
        }

        const nearbyRock = this.miningSystem.getNearbyRock(this.player.sprite.x, this.player.sprite.y)
        if (nearbyRock && !this.craftingUI.isOpenNow()) {
            const equipped = this.inventoryUI.getSelectedHotbarItem()
            const isPickaxe = equipped?.item?.id.toLowerCase().includes('pickaxe')
            const power = equipped?.item?.properties?.miningPower ?? HAND_MINING_POWER

            const destroyed = this.miningSystem.mineRock(nearbyRock, power)
            // Reuse chopping animation for now, or use a similar logic
            this.player.playChoppingAnimation(!!isPickaxe)

            if (destroyed) {
                this.player.inventory.addItem(ITEMS["stone-block"], 1)
                this.player.addXp(15)
                this.inventoryUI.refreshUI()
                this.hud.update(this.player, undefined as any)
            }
            return
        }
    }
    private handleCombat() {
        if (/*this.merchantSystem.isOpenNow() ||*/ this.craftingUI.isOpenNow() /*|| this.questUI.isOpenNow()*/) return
        if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return
        const equipped = this.inventoryUI.getSelectedHotbarItem()

        if (equipped?.item?.id === "wood-planks" || equipped?.item?.id === "crafting-table") {
            this.buildingSystem.placeBlock(this.player, equipped, this.inventoryUI)
        } else {
            this.combatSystem.handlePlayerAttack(this.player, equipped, this.time.now)
        }
    }
    private setupInventoryToggle() {
        if (Phaser.Input.Keyboard.JustDown(this.inventoryKey) && /*!this.merchantSystem.isOpenNow() &&*/ !this.inventoryUI.isOpenNow()) {
            this.inventoryUI.toggle()
        }
    }
    private startBossTeleportDialogue() {
        if (this.isTeleportingToBoss) return
        this.isTeleportingToBoss = true
        this.player.setMovementEnabled(false)

        const text = this.add.text(
            this.player.sprite.x,
            this.player.sprite.y - 90,
            "Villager: There is a boss no one can defeat...\nBe careful, hero.",
            {
                fontSize: "18px",
                color: "#ffffff",
                backgroundColor: "#000000cc",
                padding: { x: 12, y: 8 },
                align: "center",
            }
        ).setOrigin(0.5).setDepth(30)

        this.time.delayedCall(1800, () => {
            text.destroy()
            this.scene.start("SecretLevelScene")
        })
    }
    private handleDrop() {
        if (/*this.merchantSystem.isOpenNow() ||*/ this.craftingUI.isOpenNow() /*|| this.questUI.isOpenNow()*/ || this.inventoryUI.isOpenNow()) return
        if (!Phaser.Input.Keyboard.JustDown(this.dropKey)) return

        const selectedSlot = this.inventoryUI.getSelectedHotbarItem()
        if (selectedSlot && selectedSlot.item) {
            const itemToDrop = { ...selectedSlot.item }
            if (this.player.inventory.removeItem(this.inventoryUI.getSelectedHotbarIndex(), 1)) {
                const dropDistance = 40
                const tx = this.player.sprite.x + this.player.facingDirection.x * dropDistance
                const ty = this.player.sprite.y + this.player.facingDirection.y * dropDistance

                this.dropSystem.spawnDroppedItem(itemToDrop, 1, this.player.sprite.x, this.player.sprite.y, tx, ty)
                this.inventoryUI.refreshUI()
                this.inventoryUI.selectHotbarSlot(this.inventoryUI.getSelectedHotbarIndex()) // Re-sync equipment
            }
        }
    }
    private mapGenVillagePos(): { x: number, y: number } {
        const width = Math.ceil(WORLD_SIZE / GRID_SIZE)
        const height = Math.ceil(WORLD_SIZE / GRID_SIZE)
        const { x, y } = (this.mapSystem as any).worldGen.getVillagePosition(width, height)
        return { x: x * GRID_SIZE, y: y * GRID_SIZE }
    }
}
