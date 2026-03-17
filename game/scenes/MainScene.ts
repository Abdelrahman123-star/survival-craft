import * as Phaser from "phaser"
import { WORLD_SIZE, PLAYER_SPEED, GROUND_TILES } from "../config/constants"
import { Player } from "../entities/Player"
import { TreeSystem } from "../systems/TreeSystem"
import { MonsterSystem } from "../systems/MonsterSystem"
import { CombatSystem } from "../systems/CombatSystem"
import { MerchantSystem } from "../systems/MerchantSystem"
import { CraftingSystem } from "../systems/CraftingSystem"
import { HUD } from "../ui/HUD"
import { InventoryUI } from "../ui/InventoryUI"
import { CraftingUI } from "../ui/CraftingUI"
import { CraftingTable } from "../entities/CraftingTable"

export default class MainScene extends Phaser.Scene {
  // Systems
  private treeSystem!: TreeSystem
  private monsterSystem!: MonsterSystem
  private combatSystem!: CombatSystem
  private merchantSystem!: MerchantSystem
  private craftingSystem!: CraftingSystem
  private hud!: HUD
  private inventoryUI!: InventoryUI
  private craftingUI!: CraftingUI
  private craftingTable!: CraftingTable

  // Entities
  private player!: Player

  // Input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private interactKey!: Phaser.Input.Keyboard.Key
  private attackKey!: Phaser.Input.Keyboard.Key
  private inventoryKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super("MainScene")
  }

  preload() {
    const assets: Record<string, string> = {
      player: "/assets/player.png",
      ground: "/assets/plain-grass.png",
      "flower-grass": "/assets/flower-grass.png",
      grass: "/assets/grass.png",
      tree_bottom: "/assets/tree_bottom.png",
      tree_top: "/assets/tree_top.png",
      monster: "/assets/spider.png",
      merchant: "/assets/merchant.png",
      sword: "/assets/wood-sword.png",
      axe: "/assets/axe.png",
      pickaxe: "/assets/pickaxe.png",
      bow: "/assets/bow.png",
      ghost: "/assets/ghost.png",
    }
    Object.entries(assets).forEach(([key, path]) => this.load.image(key, path))
  }

  create() {
    this.createWorld()

    // Create player FIRST before setting up camera that depends on it
    this.player = new Player(this, 400, 300)

    // THEN setup camera (now player exists)
    this.setupCamera()

    this.setupControls()

    // Initialize systems
    this.treeSystem = new TreeSystem(this)
    this.monsterSystem = new MonsterSystem(this)
    this.combatSystem = new CombatSystem(this, this.monsterSystem)
    this.hud = new HUD(this)
    this.inventoryUI = new InventoryUI(this, this.player.inventory, this.player)
    this.merchantSystem = new MerchantSystem(this, 550, 300, this.player, this.inventoryUI)
    this.craftingSystem = new CraftingSystem()
    this.inventoryUI.refreshUI()
    this.craftingUI = new CraftingUI(this)
    this.craftingTable = new CraftingTable(this, 650, 340)

    // Set up collisions with proper type checking
    this.physics.add.overlap(
      this.player.sprite,
      this.monsterSystem.getMonsterGroup(),
      (obj1, obj2) => {
        // Type guard to check if objects are sprites
        const playerSprite = obj1 as Phaser.Physics.Arcade.Sprite
        const monsterSprite = obj2 as Phaser.Physics.Arcade.Sprite

        // Check if both sprites are valid and active, and if player is alive
        if (!playerSprite || !playerSprite.active || !monsterSprite || !monsterSprite.active || this.player.isDead) {
          return
        }

        const died = this.combatSystem.handlePlayerHit(
          this.player,
          monsterSprite,
          this.time.now
        )

        this.hud.update(this.player)

        if (died) {
          this.player.playDeathAnimation(() => {
            this.scene.restart()
          })
        }
      }
    )
  }

  update() {
    this.player.updateMovement(this.keys, PLAYER_SPEED, this.merchantSystem.isOpenNow())
    this.player.updateWeaponFollow()

    this.monsterSystem.update(this.player)
    this.hud.update(this.player)
    this.inventoryUI.update()

    this.handleInteraction()
    this.handleCombat()
    this.handleInventoryToggle()
  }

  private createWorld() {
    const tileSize = 16 * 3
    for (let x = 0; x < WORLD_SIZE; x += tileSize) {
      for (let y = 0; y < WORLD_SIZE; y += tileSize) {
        const texture = Phaser.Utils.Array.GetRandom(GROUND_TILES)
        this.add.image(x, y, texture).setOrigin(0).setScale(3).setDepth(0)
      }
    }
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player.sprite)
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
  }

  private setupControls() {
    this.keys = this.input.keyboard!.addKeys({
      up: "W", down: "S", left: "A", right: "D"
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.interactKey = this.input.keyboard!.addKey("E")
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.inventoryKey = this.input.keyboard!.addKey("I")
  }

  private handleInteraction() {
    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return

    if (this.merchantSystem.isPlayerInRange(this.player.sprite.x, this.player.sprite.y)) {
      this.merchantSystem.toggle(this.player)
      return
    }

    // crafting table interaction
    const dx = this.player.sprite.x - this.craftingTable.sprite.x
    const dy = this.player.sprite.y - this.craftingTable.sprite.y
    if (Math.sqrt(dx * dx + dy * dy) < 80) {
      if (this.craftingUI.isOpenNow()) this.craftingUI.hide()
      else this.craftingUI.show(this.player, this.craftingSystem, this.inventoryUI)
      return
    }

    if (this.merchantSystem.isOpenNow()) return
    if (this.craftingUI.isOpenNow()) return

    const nearbyTree = this.treeSystem.getNearbyTree(this.player.sprite.x, this.player.sprite.y)
    if (nearbyTree) {
      this.treeSystem.chopTree(nearbyTree)
      this.player.addWood(1)
      this.player.syncWoodToInventory()
      this.player.playChoppingAnimation()
      this.inventoryUI.refreshUI()
      this.hud.update(this.player)
    }
  }

  private handleCombat() {
    if (this.merchantSystem.isOpenNow()) return
    if (this.craftingUI.isOpenNow()) return
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return

    const equipped = this.inventoryUI.getSelectedHotbarItem()
    const result = this.combatSystem.handlePlayerAttack(this.player, equipped, this.time.now)
    if (result.hit && result.isCrit) {
      // Crit effect is handled in CombatSystem
    }
  }

  private handleInventoryToggle() {
    if (!Phaser.Input.Keyboard.JustDown(this.inventoryKey)) return
    if (this.merchantSystem.isOpenNow()) return
    if (this.craftingUI.isOpenNow()) return
    this.inventoryUI.toggle()
  }
}