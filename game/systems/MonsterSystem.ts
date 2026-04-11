import * as Phaser from "phaser"
import { Monster, MonsterType } from "../entities/Monster"
// import { MONSTER_SPAWN_DELAY, WORLD_SIZE } from "../config/constants"
import { Player } from "../entities/Player"

export class MonsterSystem {
  private monsters: Monster[] = []
  private scene: Phaser.Scene
  private monsterSprites: Phaser.Physics.Arcade.Sprite[] = []
  private monsterGroup: Phaser.Physics.Arcade.Group
  public onMonsterDeath?: (type: string, x: number, y: number) => void
  private chunkMonsters: Map<string, Monster[]> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.monsterGroup = scene.physics.add.group()
  }

  public onChunkLoaded(data: any): void {
    const key = `${data.x},${data.y}`
    if (this.chunkMonsters.has(key)) return

    const monstersInChunk: Monster[] = []
    data.objects.forEach((obj: any) => {
      if (obj.type === "monster") {
        const type = obj.texture as MonsterType
        const x = obj.x * 48 + 24 // GRID_SIZE=48
        const y = obj.y * 48 + 24
        const monster = new Monster(this.scene, x, y, type)
        this.monsters.push(monster)
        this.monsterGroup.add(monster.sprite)
        monstersInChunk.push(monster)
      }
    })
    this.chunkMonsters.set(key, monstersInChunk)
    this.updateMonsterSprites()
  }

  public onChunkUnloaded(key: string): void {
    const monstersInChunk = this.chunkMonsters.get(key)
    if (monstersInChunk) {
      monstersInChunk.forEach(monster => {
        monster.destroy()
        this.monsters = this.monsters.filter(m => m !== monster)
      })
      this.chunkMonsters.delete(key)
      this.updateMonsterSprites()
    }
  }

  public spawnMonster(type: MonsterType, x?: number, y?: number) {
    const sx = x ?? 0
    const sy = y ?? 0
    const monster = new Monster(this.scene, sx, sy, type)
    this.monsters.push(monster)
    this.monsterGroup.add(monster.sprite)
    this.updateMonsterSprites()
    return monster
  }


  update(player: Player, onAttack?: (damage: number) => void) {
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
