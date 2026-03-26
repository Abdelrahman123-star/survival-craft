import * as Phaser from "phaser"
import { GRID_SIZE, PLAYER_SPEED } from "../config/constants"
import { Player } from "../entities/Player"
import { CombatSystem } from "../systems/CombatSystem"
import type { MonsterSystem } from "../systems/MonsterSystem"
import { QuestSystem } from "../systems/QuestSystem"
import { HUD } from "../ui/HUD"
import { InventoryUI } from "../ui/InventoryUI"
import { BuildingSystem } from "../systems/BuildingSystem"
import { BossMonster } from "../entities/BossMonster"
import { ITEMS } from "../config/items"

type SpawnPoint = { x: number, y: number }
type DoorTileRef = {
  layer: Phaser.Tilemaps.TilemapLayer
  tileX: number
  tileY: number
  worldX: number
  worldY: number
}

export default class SecretLevelScene extends Phaser.Scene {
  private player!: Player
  private combatSystem!: CombatSystem
  private questSystem!: QuestSystem
  private hud!: HUD
  private inventoryUI!: InventoryUI
  private buildingSystem!: BuildingSystem
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private attackKey!: Phaser.Input.Keyboard.Key
  private inventoryKey!: Phaser.Input.Keyboard.Key
  private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = []
  private allTileLayers: Phaser.Tilemaps.TilemapLayer[] = []
  private readonly mapScale = GRID_SIZE / 14
  private boss!: BossMonster
  private isBossDefeated = false
  private doorPair: { left: DoorTileRef, right: DoorTileRef } | null = null
  private doorSprites: { left: Phaser.GameObjects.Image, right: Phaser.GameObjects.Image } | null = null
  private isDoorOpening = false
  private isDoorOpen = false
  private isTransitioningToMain = false

  constructor() {
    super("SecretLevelScene")
  }

  preload() {
    this.load.spritesheet("player", "/assets/Charachter Animation/CharachterAnimation.png", { frameWidth: 48, frameHeight: 48 })
    const assets: Record<string, string> = {
      "wood-sword": "/assets/wood-sword.png",
      hammer: "/assets/hammer.png",
      "wood-planks": "/assets/wood-planks.jpg",
      axe: "/assets/axe.png",
      pickaxe: "/assets/pickaxe.png",
      bow: "/assets/bow.png",
      ghost: "/assets/ghost.png",
      spider: "/assets/spider.png",
      brute: "/assets/spider.png",
      boss: "/assets/DesertBoss.png",
      "boss-key": "/assets/key.png",
      "door-left-1": "/assets/Seecretdoor/door_PartialyoppendLeft.png",
      "door-right-1": "/assets/Seecretdoor/door_PartialyoppendRight.png",
      "door-left-2": "/assets/Seecretdoor/door_AlmostoppendLeft.png",
      "door-right-2": "/assets/Seecretdoor/door_AlmostoppendRight.png",
      "door-left-3": "/assets/Seecretdoor/door_fullyoppendLeft.png",
      "door-right-3": "/assets/Seecretdoor/door_fullyoppendRgiht.png",
    }
    Object.entries(assets).forEach(([key, path]) => this.load.image(key, path))

    this.load.tilemapTiledJSON("map", "/Sercret level map/Secretmap.json")
    this.load.image("tiles", "/Sercret level map/Secretspritesheet.png")
  }

  create() {
    this.cameras.main.roundPixels = true
    window.addEventListener("contextmenu", (e) => e.preventDefault())
    this.game.canvas.oncontextmenu = () => false
    this.setupControls()

    const map = this.make.tilemap({ key: "map" })
    const tileset = map.addTilesetImage("spritefusion", "tiles")
    if (!tileset) {
      throw new Error("Tileset 'spritefusion' not found in Secretmap.json")
    }

    this.collisionLayers = []
    this.allTileLayers = []
    map.layers.forEach((layerData) => {
      const layer = map.createLayer(layerData.name, tileset, 0, 0)
      if (!layer) return
      layer.setScale(this.mapScale)
      this.allTileLayers.push(layer)

      const layerProperties = (layerData.properties ?? []) as Array<{ name?: string, value?: unknown }>
      const hasColliderProperty = layerProperties.some(
        (property) => property.name === "collider" && property.value === true
      )
      if (hasColliderProperty) {
        layer.setCollisionByExclusion([-1])
        this.collisionLayers.push(layer)
      }
    })

    const spawnPoint = this.getSpawnPoint(map)
    this.player = new Player(this, spawnPoint.x, spawnPoint.y)
    this.spawnBoss(map, spawnPoint)

    this.boss.onAttackHit = (damage) => {
      if (this.player.isDead) return
      if (this.combatSystem.applyMonsterDamage(this.player, damage)) {
        this.player.playDeathAnimation(() => this.scene.restart())
      }
    }

    this.buildingSystem = new BuildingSystem(this)
    this.questSystem = new QuestSystem(this)
    this.combatSystem = new CombatSystem(this, this.createBossMonsterSystem())
    this.hud = new HUD(this)
    this.inventoryUI = new InventoryUI(this, this.player.inventory, this.player)

    this.collisionLayers.forEach((layer) => {
      this.physics.add.collider(this.player.sprite, layer)
      this.physics.add.collider(this.boss.sprite, layer)
    })
    this.physics.add.collider(this.player.sprite, this.buildingSystem.getBlocksGroup())
    this.physics.add.collider(this.boss.sprite, this.buildingSystem.getBlocksGroup())

    this.physics.add.overlap(this.player.sprite, this.boss.sprite, (_, bossSprite) => {
      // Boss damage is now handled by its windup logic
    })

    this.doorPair = this.findDoorPair(map)
    this.setupCamera(map)
    this.hud.update(this.player, this.questSystem)
  }

  update() {
    this.player.updateMovement(this.keys, PLAYER_SPEED)
    this.player.updateWeaponFollow()
    if (this.boss?.isActive()) this.boss.update(this.player.sprite)
    this.hud.update(this.player, this.questSystem)
    this.inventoryUI.update()
    this.buildingSystem.update(this.player, this.inventoryUI.getSelectedHotbarItem())

    this.handleCombat()
    this.setupInventoryToggle()
    this.tryOpenDoor()
    this.tryEnterMainSceneDoor()
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap) {
    this.cameras.main.startFollow(this.player.sprite)
    const worldWidth = map.widthInPixels * this.mapScale
    const worldHeight = map.heightInPixels * this.mapScale
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
  }

  private setupControls() {
    this.keys = this.input.keyboard!.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.attackKey = this.input.keyboard!.addKey("SPACE")
    this.inventoryKey = this.input.keyboard!.addKey("I")
  }

  private handleCombat() {
    if (!Phaser.Input.Keyboard.JustDown(this.attackKey)) return
    const equipped = this.inventoryUI.getSelectedHotbarItem()

    if (equipped?.item?.id === "wood-planks") {
      this.buildingSystem.placeBlock(this.player, equipped, this.inventoryUI)
    } else {
      this.combatSystem.handlePlayerAttack(this.player, equipped, this.time.now)
    }
  }

  private setupInventoryToggle() {
    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryUI.toggle()
    }
  }

  private getSpawnPoint(map: Phaser.Tilemaps.Tilemap): SpawnPoint {
    return { x: 400, y: 1000 } // Example: Center of a typical small map
  }


  private isBlockedTile(tileX: number, tileY: number): boolean {
    return this.collisionLayers.some((layer) => {
      const tile = layer.getTileAt(tileX, tileY)
      return !!tile && tile.index !== -1
    })
  }

  private createBossMonsterSystem(): MonsterSystem {
    return {
      getMonstersInRange: (playerX: number, playerY: number, range: number) => {
        if (!this.boss || !this.boss.isActive()) return []
        const dist = Phaser.Math.Distance.Between(playerX, playerY, this.boss.sprite.x, this.boss.sprite.y)
        return dist <= range ? [this.boss as unknown as never] : []
      },
      damageMonster: (monster: unknown, damage: number) => {
        const target = monster as BossMonster
        if (!target?.isActive?.()) return false
        const died = target.takeDamage(damage)
        if (died) this.onBossDefeated()
        return true
      },
      getMonsterAt: (sprite: Phaser.Physics.Arcade.Sprite) => {
        if (this.boss && this.boss.isActive() && sprite === this.boss.sprite) {
          return this.boss as unknown as never
        }
        return undefined
      },
    } as unknown as MonsterSystem
  }

  private spawnBoss(map: Phaser.Tilemaps.Tilemap, playerSpawn: SpawnPoint) {
    const tileW = map.tileWidth
    const tileH = map.tileHeight
    const bossTileX = 20
    const bossTileY = 5

    const worldX = (bossTileX * tileW + tileW / 2) * this.mapScale
    const worldY = (bossTileY * tileH + tileH / 2) * this.mapScale

    this.boss = new BossMonster(this, worldX, worldY)
  }

  private onBossDefeated() {
    if (this.isBossDefeated) return
    this.isBossDefeated = true

    this.player.addXp(1500)
    this.player.inventory.addItem(ITEMS["boss-key"], 1)
    this.moveBossKeyToNinthHotbarAndSelect()
    this.inventoryUI.refreshUI()
    this.hud.update(this.player, this.questSystem)

    const text = this.add.text(this.player.sprite.x, this.player.sprite.y - 90, "Boss defeated! You got a key!", {
      fontSize: "24px",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(30)

    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1600,
      onComplete: () => text.destroy(),
    })
  }

  private moveBossKeyToNinthHotbarAndSelect() {
    const targetIndex = 8
    const slots = this.player.inventory.getAllSlots()
    const keyIndex = slots.findIndex((slot) => slot.item?.id === "boss-key")
    if (keyIndex === -1) return
    if (keyIndex !== targetIndex) {
      this.player.inventory.swapSlots(keyIndex, targetIndex)
    }
    this.inventoryUI.selectHotbarSlot(targetIndex)
  }

  private findDoorPair(map: Phaser.Tilemaps.Tilemap): { left: DoorTileRef, right: DoorTileRef } | null {
    const doorIndexes = new Set([23, 24, 25])
    const tiles: DoorTileRef[] = []

    this.allTileLayers.forEach((layer) => {
      layer.forEachTile((tile) => {
        if (!doorIndexes.has(tile.index)) return
        tiles.push({
          layer,
          tileX: tile.x,
          tileY: tile.y,
          worldX: (tile.pixelX + map.tileWidth / 2) * this.mapScale,
          worldY: (tile.pixelY + map.tileHeight / 2) * this.mapScale,
        })
      })
    })

    tiles.sort((a, b) => (a.tileY - b.tileY) || (a.tileX - b.tileX))
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const a = tiles[i]
        const b = tiles[j]
        if (a.layer !== b.layer) continue
        if (a.tileY === b.tileY && Math.abs(a.tileX - b.tileX) === 1) {
          return a.tileX < b.tileX ? { left: a, right: b } : { left: b, right: a }
        }
      }
    }

    return null
  }

  private tryOpenDoor() {
    if (this.isDoorOpen || this.isDoorOpening || !this.doorPair || !this.isBossDefeated) return
    if (!this.player.inventory.hasItem("boss-key", 1)) return

    const centerX = (this.doorPair.left.worldX + this.doorPair.right.worldX) / 2
    const centerY = (this.doorPair.left.worldY + this.doorPair.right.worldY) / 2
    const nearDoor = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, centerX, centerY) < 130
    if (!nearDoor) return

    this.startDoorOpenAnimation()
  }

  private startDoorOpenAnimation() {
    if (!this.doorPair) return
    this.isDoorOpening = true
    this.player.inventory.removeItemById("boss-key", 1)
    this.inventoryUI.refreshUI()

    const left = this.add.image(this.doorPair.left.worldX, this.doorPair.left.worldY, "door-left-1")
      .setScale(this.mapScale)
      .setDepth(15)
    const right = this.add.image(this.doorPair.right.worldX, this.doorPair.right.worldY, "door-right-1")
      .setScale(this.mapScale)
      .setDepth(15)
    this.doorSprites = { left, right }

    const frames = [
      { left: "door-left-1", right: "door-right-1", delay: 0 },
      { left: "door-left-2", right: "door-right-2", delay: 350 },
      { left: "door-left-3", right: "door-right-3", delay: 700 },
    ]
    frames.forEach((frame) => {
      this.time.delayedCall(frame.delay, () => {
        if (!this.doorSprites) return
        this.doorSprites.left.setTexture(frame.left)
        this.doorSprites.right.setTexture(frame.right)
      })
    })

    this.time.delayedCall(1100, () => {
      if (!this.doorPair) return
      this.doorPair.left.layer.removeTileAt(this.doorPair.left.tileX, this.doorPair.left.tileY)
      this.doorPair.right.layer.removeTileAt(this.doorPair.right.tileX, this.doorPair.right.tileY)
      this.isDoorOpen = true
      this.isDoorOpening = false
    })
  }

  private tryEnterMainSceneDoor() {
    if (!this.isDoorOpen || !this.doorPair || this.isTransitioningToMain) return

    const centerX = (this.doorPair.left.worldX + this.doorPair.right.worldX) / 2
    const centerY = (this.doorPair.left.worldY + this.doorPair.right.worldY) / 2
    const closeEnough = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, centerX, centerY) < 70
    if (!closeEnough) return

    this.isTransitioningToMain = true
    this.scene.start("MainScene")
  }
}