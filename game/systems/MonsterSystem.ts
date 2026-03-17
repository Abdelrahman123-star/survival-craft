import * as Phaser from "phaser"
import { Monster, MonsterType } from "../entities/Monster"
import { MONSTER_SPAWN_DELAY, WORLD_SIZE } from "../config/constants"
import { Player } from "../entities/Player"

export class MonsterSystem {
  private monsters: Monster[] = []
  private scene: Phaser.Scene
  private monsterSprites: Phaser.Physics.Arcade.Sprite[] = [] // Track sprites separately
  private monsterGroup: Phaser.Physics.Arcade.Group

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

  spawnMonster() {
    const x = Math.random() * WORLD_SIZE
    const y = Math.random() * WORLD_SIZE
    const roll = Math.random()
    let type: MonsterType = "spider"
    if (roll < 0.50) type = "spider"
    else if (roll < 0.72) type = "ghost"
    else type = "brute"

    const monster = new Monster(this.scene, x, y, type)
    this.monsters.push(monster)

    // add to physics group so overlaps keep working as monsters spawn/die
    this.monsterGroup.add(monster.sprite)
    this.updateMonsterSprites()
  }

  update(player: Player) {
    // First, remove any dead monsters
    this.monsters = this.monsters.filter(monster => {
      const isActive = monster.isActive()
      if (!isActive) {
        // Monster is dead, remove it
        return false
      }
      return true
    })

    // Update sprite array
    this.updateMonsterSprites()

    // Then update remaining monsters
    this.monsters.forEach(monster => {
      monster.update(player.sprite)
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
}