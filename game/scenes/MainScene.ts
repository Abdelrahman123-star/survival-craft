import * as Phaser from "phaser"
import { UIManager } from "../ui/UIManager"
import { TreeSystem } from "../systems/TreeSystem"
import { HUD } from "../ui/HUD"
import { QuestSystem } from "../systems/QuestSystem"
import { CombatSystem } from "../systems/CombatSystem"
import { MonsterSystem } from "../systems/MonsterSystem"
import { PLAYER_SPEED, WORLD_SIZE } from "../config/constants"
import { ITEMS } from "../config/items"
import { LOOT_TABLES } from "../config/loot"
import { InventoryUI } from "../ui/InventoryUI"
import { MerchantSystem } from "../systems/MerchantSystem"
import { CraftingSystem } from "../systems/CraftingSystem"
import { CraftingUI } from "../ui/CraftingUI"
import { CraftingTable } from "../entities/CraftingTable"
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


export default class MainScene extends Phaser.Scene {
    private treeSystem!: TreeSystem
    private hud!: HUD
    private inventoryUI!: InventoryUI
    private questSystem!: QuestSystem
    private combatSystem!: CombatSystem
    private monsterSystem!: MonsterSystem
    private merchantSystem!: MerchantSystem
    private craftingSystem!: CraftingSystem
    private craftingUI!: CraftingUI
    private craftingTable!: CraftingTable
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
    private debugTimeKey!: Phaser.Input.Keyboard.Key
    private dropSystem!: DropSystem
    private dropKey!: Phaser.Input.Keyboard.Key

    private debugText!: Phaser.GameObjects.Text
    constructor() { super("MainScene") }

    preload() {
        document.fonts.load('16px Alagard')
        this.load.spritesheet("player", "/assets/Charachter Animation/CharachterAnimation.png", { frameWidth: 48, frameHeight: 48 })
        const assets: Record<string, string> = {
            ground: "/assets/plain-grass.png",
            "flower-grass": "/assets/flower-grass.png", grass: "/assets/grass.png",
            tree_bottom: "/assets/tree.png",
            spider: "/assets/spider.png", merchant: "/assets/merchant.png",
            "wood-sword": "/assets/wood-sword.png", axe: "/assets/axe.png",
            pickaxe: "/assets/pickaxe.png", bow: "/assets/bow.png",
            ghost: "/assets/ghost.png", "wood-planks": "/assets/wood-planks.jpg",
            stick: "/assets/stick.png", "crafting-table": "/assets/crafting-table.png",
            hammer: "/assets/hammer.png", brute: "/assets/spider.png",
            "villager-worker": "/assets/villigers/worker.png",
            "villager-smith": "/assets/villigers/WorkSmith.png",
            "villager-oldlady": "/assets/villigers/OldLady.png",
            "villager-younglady": "/assets/villigers/YoungLady.png",
            "quest-available": "/assets/interface/Questavailable.png",
            "quest-active": "/assets/interface/Questactive.png",
            villager: "/assets/villiger.png",
            "spider-web": "/assets/loot/spider_web.png",
            "spider-eye": "/assets/loot/spider_eye.png",
            feather: "/assets/loot/feather.png",
        }
        Object.entries(assets).forEach(([k, v]) => this.load.image(k, v))
        this.load.spritesheet("tileset", "/assets/tileset.png", { frameWidth: 16, frameHeight: 16 })
        this.load.image("craftTiles", "/assets/ui/crafting-ui/craftTiles.png")
        this.load.tilemapTiledJSON("craft-tilemap", "/assets/ui/crafting-ui/craft-tilemap.json")
        this.load.image("inventory-tilemap", "/assets/ui/inventory/inventoryTilemap.png")
        this.load.tilemapTiledJSON("inventory-map", "/assets/ui/inventory/inventoryMap.json")
    }

    create() {
        // Debugging
        // this.debugText = this.add.text(10, 10, '', {
        //     fontSize: '14px',
        //     color: '#00ff00',
        //     backgroundColor: '#00000088',
        //     padding: { x: 5, y: 5 }
        // }).setScrollFactor(0).setDepth(999)        // stop here
        window.addEventListener("contextmenu", (e) => e.preventDefault())
        this.game.canvas.oncontextmenu = () => false
        this.setupControls()
        this.mapSystem = new MapSystem(this)
        this.player = new Player(this, 750, 750)

        this.villager = this.physics.add.sprite(this.villagerSpawn.x, this.villagerSpawn.y, "villager").setScale(3).setDepth(1)
        this.villager.setImmovable(true)

        this.setupCamera()
        this.treeSystem = new TreeSystem(this)

        // Add village trees
        const centerX = WORLD_SIZE / 2
        const centerY = WORLD_SIZE / 2
        this.treeSystem.createTree(centerX - 64, centerY - 96, "green")
        this.treeSystem.createTree(centerX + 32, centerY - 96, "orange")

        this.monsterSystem = new MonsterSystem(this)
        this.questSystem = new QuestSystem(this)

        this.monsterSystem.onMonsterDeath = (type, x, y) => {
            const xpValues: Record<string, number> = { spider: 20, ghost: 40, brute: 60 }
            const xp = xpValues[type] || 10
            this.player.addXp(xp)
            this.questSystem.updateProgress("kill", type, 1, this.player)
            this.hud.update(this.player, this.questSystem)

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
        this.merchantSystem = new MerchantSystem(this, 750, 600, this.player, this.inventoryUI)
        this.craftingSystem = new CraftingSystem()
        this.craftingUI = new CraftingUI(this)

        this.uiManager.registerUI("inventory", this.inventoryUI)
        this.uiManager.registerUI("crafting", this.craftingUI)

        this.craftingTable = new CraftingTable(this, 850, 750)
        this.buildingSystem = new BuildingSystem(this)

        // Quest UI and Villager System
        this.questUI = new QuestUI(this)
        this.villagerSystem = new VillagerSystem(this, this.questSystem, this.questUI)
        this.uiManager.registerUI("quest", this.questUI)

        this.physics.add.collider(this.villager, this.mapSystem.getObstacleLayer())


        this.physics.add.collider(this.player.sprite, this.mapSystem.getObstacleLayer())
        this.physics.add.collider(this.villagerSystem.getVillagerGroup(), this.mapSystem.getObstacleLayer())
        this.physics.add.collider(this.player.sprite, this.buildingSystem.getBlocksGroup())
        this.physics.add.collider(this.monsterSystem.getMonsterGroup(), this.buildingSystem.getBlocksGroup(), (m, b) => {
            const monster = this.monsterSystem.getMonsterAt(m as Phaser.Physics.Arcade.Sprite)
            if (monster && monster.isActive()) {
                this.buildingSystem.damageBlock(b as Phaser.GameObjects.Sprite, monster.getDamage() * 0.1)
            }
        })

        this.physics.add.overlap(this.player.sprite, this.monsterSystem.getMonsterGroup(), (p, m) => {
            // Collision is now mostly for physical blocking or potential knockback, 
            // damage is handled by the monster's attack windup in update()
        })

        this.physics.add.collider(this.monsterSystem.getMonsterGroup(), this.mapSystem.getObstacleLayer())


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
    }

    update() {
        // Debug
        // const fps = Math.round(this.game.loop.actualFps)
        // const playerX = this.player.sprite.x.toFixed(1)
        // const playerY = this.player.sprite.y.toFixed(1)
        // const velocity = this.player.sprite.body?.velocity

        // this.debugText.setText([
        //     `FPS: ${fps}`,
        //     `Player: (${playerX}, ${playerY})`,
        //     `Velocity: (${velocity?.x.toFixed(1)}, ${velocity?.y.toFixed(1)})`,
        //     `Monsters: ${this.monsterSystem.getMonsterGroup().getLength()}`,
        //     `Objects: ${this.children.list.length}`,
        // ])
        // STOP HERE

        this.player.updateMovement(this.keys, PLAYER_SPEED)
        this.player.updateWeaponFollow()
        this.monsterSystem.update(this.player, (damage) => {
            if (this.player.isDead) return
            if (this.combatSystem.applyMonsterDamage(this.player, damage)) {
                this.player.playDeathAnimation(() => this.scene.restart())
            }
        })
        this.hud.update(this.player, this.questSystem)
        this.uiManager.update()
        this.merchantSystem.update()
        this.buildingSystem.update(this.player, this.inventoryUI.getSelectedHotbarItem())
        this.villagerSystem.update()

        this.handleInteraction()
        this.handleCombat()
        this.handleDrop()
        this.setupInventoryToggle()

        this.dropSystem.update(this.player)



        const dayNightState = this.dayNightSystem.update(this.game.loop.delta)
        this.worldOverlay.update(dayNightState, this.game.loop.delta)
        this.dayNightHUD.update(dayNightState)


        // Hold T to fast-forward time (debug only)
        if (this.debugTimeKey.isDown) {
            this.dayNightSystem.fastForward(0.005) // tweak this speed
        }



    }

    private setupCamera() {
        this.cameras.main.startFollow(this.player.sprite)
        this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
        this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    }

    private setupControls() {
        this.keys = this.input.keyboard!.addKeys({ up: "W", down: "S", left: "A", right: "D" }) as any
        this.interactKey = this.input.keyboard!.addKey("E")
        this.attackKey = this.input.keyboard!.addKey("SPACE")
        this.inventoryKey = this.input.keyboard!.addKey("I")
        this.debugTimeKey = this.input.keyboard!.addKey("T")
        this.dropKey = this.input.keyboard!.addKey("Q")
    }

    private handleInteraction() {
        if (this.questUI.isOpenNow()) return
        if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return

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

        const dx = this.player.sprite.x - this.craftingTable.sprite.x, dy = this.player.sprite.y - this.craftingTable.sprite.y
        if (Math.sqrt(dx * dx + dy * dy) < 80) {
            if (this.craftingUI.isOpenNow()) this.craftingUI.hide()
            else {
                this.craftingUI.show(this.player, this.craftingSystem)
            }
            return
        }

        const nearbyTree = this.treeSystem.getNearbyTree(this.player.sprite.x, this.player.sprite.y)
        if (nearbyTree && !this.merchantSystem.isOpenNow() && !this.craftingUI.isOpenNow()) {
            this.treeSystem.chopTree(nearbyTree)
            this.player.inventory.addItem(ITEMS["wood"], 1)
            this.player.playChoppingAnimation()

            // Grant XP and update quest
            this.player.addXp(10)
            this.questSystem.updateProgress("chop", undefined, 1, this.player)

            this.inventoryUI.refreshUI()
            this.hud.update(this.player, this.questSystem)
        }
    }

    private handleCombat() {
        if (this.merchantSystem.isOpenNow() || this.craftingUI.isOpenNow() || this.questUI.isOpenNow()) return
        if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return
        const equipped = this.inventoryUI.getSelectedHotbarItem()

        if (equipped?.item?.id === "wood-planks") {
            this.buildingSystem.placeBlock(this.player, equipped, this.inventoryUI)
        } else {
            this.combatSystem.handlePlayerAttack(this.player, equipped, this.time.now)
        }
    }

    private setupInventoryToggle() {
        if (Phaser.Input.Keyboard.JustDown(this.inventoryKey) && !this.merchantSystem.isOpenNow() && !this.questUI.isOpenNow()) {
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
        if (this.merchantSystem.isOpenNow() || this.craftingUI.isOpenNow() || this.questUI.isOpenNow() || this.inventoryUI.isOpenNow()) return
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
}
