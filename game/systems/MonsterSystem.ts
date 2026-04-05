import * as Phaser from "phaser"
import { Monster, MonsterType } from "../entities/Monster"
import { MONSTER_SPAWN_DELAY, WORLD_SIZE } from "../config/constants"
import { Player } from "../entities/Player"

export class MonsterSystem {
  private monsters: Monster[] = []
  private scene: Phaser.Scene
  private monsterSprites: Phaser.Physics.Arcade.Sprite[] = []
  private monsterGroup: Phaser.Physics.Arcade.Group
  public onMonsterDeath?: (type: string, x: number, y: number) => void

  private lastPlayerX: number = 750
  private lastPlayerY: number = 750

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.monsterGroup = scene.physics.add.group()

    // Spawn initial monsters
    for (let i = 0; i < 2; i++) this.spawnMonster()

    // Set up spawning timer
    scene.time.addEvent({
      delay: MONSTER_SPAWN_DELAY,
      callback: this.spawnMonster,
      callbackScope: this,
      loop: true,
    })
  }

  spawnMonster(type?: MonsterType, x?: number, y?: number) {
    let spawnX = x
    let spawnY = y

    if (spawnX === undefined || spawnY === undefined) {
      // Determine spawn point 600-1000 pixels away from the player
      const angle = Math.random() * Math.PI * 2
      const dist = 600 + Math.random() * 400
      spawnX = this.lastPlayerX + Math.cos(angle) * dist
      spawnY = this.lastPlayerY + Math.sin(angle) * dist
    }

    let monsterType = type
    if (!monsterType) {
      const roll = Math.random()
      if (roll < 0.50) monsterType = "spider"
      else if (roll < 0.72) monsterType = "ghost"
      else monsterType = "brute"
    }

    const monster = new Monster(this.scene, spawnX, spawnY, monsterType)
    this.monsters.push(monster)

    // add to physics group
    this.monsterGroup.add(monster.sprite)
    this.updateMonsterSprites()
  }

  update(player: Player, onAttack?: (damage: number) => void) {
    this.lastPlayerX = player.sprite.x
    this.lastPlayerY = player.sprite.y

    // First, remove any dead monsters AND cull distant ones
    this.monsters = this.monsters.filter(monster => {
      if (!monster.isActive()) return false

      const dist = Phaser.Math.Distance.Between(this.lastPlayerX, this.lastPlayerY, monster.sprite.x, monster.sprite.y)
      if (dist > 1800) {
        monster.destroy()
        return false // Despawn far monsters
      }

      return true
    })

    // Update sprite array for collision detection
    this.updateMonsterSprites()

    // Then update remaining monsters
    this.monsters.forEach(monster => {
      monster.update(player.sprite, onAttack)
    })
  }

  private updateMonsterSprites() {
    this.monsterSprites = this.monsters
      .filter(m => m.isActive())
      .map(m => m.sprite)
  }

  getMonstersInRange(playerX: number, playerY: number, range: number): Monster[] {
    return this.monsters.filter(monster => {
      if (!monster.isActive()) return false
      const dx = playerX - monster.sprite.x
      const dy = playerY - monster.sprite.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= range
    })
  }

  damageMonster(monster: Monster, damage: number): boolean {
    const died = monster.damage(damage, this.scene)
    if (died) {
      if (this.onMonsterDeath) this.onMonsterDeath(monster.type, monster.sprite.x, monster.sprite.y)
      // Immediately remove from our arrays
      this.monsters = this.monsters.filter(m => m !== monster)
      this.monsterGroup.remove(monster.sprite, true, false)
      this.updateMonsterSprites()
    }
    return true // Monster was hit
  }

  getMonsterAt(sprite: Phaser.Physics.Arcade.Sprite): Monster | undefined {
    return this.monsters.find(m => m.isActive() && m.sprite === sprite)
  }

  getMonsterSprites(): Phaser.Physics.Arcade.Sprite[] {
    // Return a fresh copy of the array
    return [...this.monsterSprites]
  }

  getMonsterGroup(): Phaser.Physics.Arcade.Group {
    return this.monsterGroup
  }

  // Clean up method to remove all monsters
  cleanup() {
    this.monsters.forEach(monster => monster.destroy())
    this.monsters = []
    this.monsterSprites = []
    this.monsterGroup.clear(true, true)
  }



  private spawnMultiplier = 1.0

  setSpawnMultiplier(multiplier: number) {
    this.spawnMultiplier = multiplier
  }


}
