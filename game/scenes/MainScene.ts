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
import { BuildingSystem } from "../systems/BuildingSystem"
import { ITEMS } from "../config/items"

export default class MainScene extends Phaser.Scene {
  private treeSystem!: TreeSystem
  private monsterSystem!: MonsterSystem
  private combatSystem!: CombatSystem
  private merchantSystem!: MerchantSystem
  private craftingSystem!: CraftingSystem
  private hud!: HUD
  private inventoryUI!: InventoryUI
  private craftingUI!: CraftingUI
  private craftingTable!: CraftingTable
  private buildingSystem!: BuildingSystem
  private player!: Player
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private interactKey!: Phaser.Input.Keyboard.Key
  private attackKey!: Phaser.Input.Keyboard.Key
  private inventoryKey!: Phaser.Input.Keyboard.Key

  constructor() { super("MainScene") }

  preload() {
    const assets: Record<string, string> = {
      player: "/assets/player.png", ground: "/assets/plain-grass.png",
      "flower-grass": "/assets/flower-grass.png", grass: "/assets/grass.png",
      tree_bottom: "/assets/tree_bottom.png", tree_top: "/assets/tree_top.png",
      monster: "/assets/spider.png", merchant: "/assets/merchant.png",
      "wood-sword": "/assets/wood-sword.png", axe: "/assets/axe.png",
      pickaxe: "/assets/pickaxe.png", bow: "/assets/bow.png",
      ghost: "/assets/ghost.png", "wood-planks": "/assets/wood-planks.jpg",
      stick: "/assets/stick.png", "crafting-table": "/assets/crafting-table.png",
    }
    Object.entries(assets).forEach(([k, v]) => this.load.image(k, v))
  }

  create() {
    window.addEventListener("contextmenu", (e) => e.preventDefault())
    this.game.canvas.oncontextmenu = () => false
    this.createWorld()
    this.player = new Player(this, 400, 300)
    this.setupCamera()
    this.setupControls()
    this.treeSystem = new TreeSystem(this)
    this.monsterSystem = new MonsterSystem(this)
    this.combatSystem = new CombatSystem(this, this.monsterSystem)
    this.hud = new HUD(this)
    this.inventoryUI = new InventoryUI(this, this.player.inventory, this.player)
    this.merchantSystem = new MerchantSystem(this, 550, 300, this.player, this.inventoryUI)
    this.craftingSystem = new CraftingSystem()
    this.craftingUI = new CraftingUI(this)
    this.inventoryUI.setCraftingUI(this.craftingUI)
    this.craftingTable = new CraftingTable(this, 650, 340)
    this.buildingSystem = new BuildingSystem(this)

    this.physics.add.collider(this.player.sprite, this.buildingSystem.getBlocksGroup())
    this.physics.add.collider(this.monsterSystem.getMonsterGroup(), this.buildingSystem.getBlocksGroup(), (m, b) => {
      const monster = this.monsterSystem.getMonsterAt(m as Phaser.Physics.Arcade.Sprite)
      if (monster && monster.isActive()) {
        // Deal small amount of damage to block on contact
        this.buildingSystem.damageBlock(b as Phaser.GameObjects.Sprite, monster.getDamage() * 0.1)
      }
    })

    this.physics.add.overlap(this.player.sprite, this.monsterSystem.getMonsterGroup(), (p, m) => {
      if (this.player.isDead) return
      if (this.combatSystem.handlePlayerHit(this.player, m as Phaser.Physics.Arcade.Sprite, this.time.now)) {
        this.player.playDeathAnimation(() => this.scene.restart())
      }
      this.hud.update(this.player)
    })
  }

  update() {
    this.player.updateMovement(this.keys, PLAYER_SPEED)
    this.player.updateWeaponFollow()
    this.monsterSystem.update(this.player)
    this.hud.update(this.player)
    this.inventoryUI.update()
    this.craftingUI.update()
    this.merchantSystem.update()
    this.buildingSystem.update(this.player, this.inventoryUI.getSelectedHotbarItem())

    this.handleInteraction()
    this.handleCombat()
    this.setupInventoryToggle()
  }

  private createWorld() {
    const ts = 48
    for (let x = 0; x < WORLD_SIZE; x += ts) {
      for (let y = 0; y < WORLD_SIZE; y += ts) {
        this.add.image(x, y, Phaser.Utils.Array.GetRandom(GROUND_TILES)).setOrigin(0).setScale(3).setDepth(0)
      }
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
  }

  private handleInteraction() {
    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return

    if (this.merchantSystem.isPlayerInRange(this.player.sprite.x, this.player.sprite.y)) {
      this.merchantSystem.toggle(this.player)
      return
    }

    const dx = this.player.sprite.x - this.craftingTable.sprite.x, dy = this.player.sprite.y - this.craftingTable.sprite.y
    if (Math.sqrt(dx * dx + dy * dy) < 80) {
      if (this.craftingUI.isOpenNow()) this.craftingUI.hide()
      else {
        this.craftingUI.show(this.player, this.craftingSystem, this.inventoryUI)
        if (!this.inventoryUI.isOpenNow()) this.inventoryUI.toggle()
      }
      return
    }

    const nearbyTree = this.treeSystem.getNearbyTree(this.player.sprite.x, this.player.sprite.y)
    if (nearbyTree && !this.merchantSystem.isOpenNow() && !this.craftingUI.isOpenNow()) {
      this.treeSystem.chopTree(nearbyTree)
      this.player.inventory.addItem(ITEMS["wood"], 1)
      this.player.playChoppingAnimation()
      this.inventoryUI.refreshUI()
      this.hud.update(this.player)
    }
  }

  private handleCombat() {
    if (this.merchantSystem.isOpenNow() || this.craftingUI.isOpenNow()) return
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return
    const equipped = this.inventoryUI.getSelectedHotbarItem()

    // Building priority if wood-planks are selected
    if (equipped?.item?.id === "wood-planks") {
      this.buildingSystem.placeBlock(this.player, equipped, this.inventoryUI)
    } else {
      this.combatSystem.handlePlayerAttack(this.player, equipped, this.time.now)
    }
  }

  private setupInventoryToggle() {
    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey) && !this.merchantSystem.isOpenNow()) {
      this.inventoryUI.toggle()
    }
  }
}