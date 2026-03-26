// World
export const WORLD_SIZE = 1500
export const GRID_SIZE = 48
export const PLAYER_SPEED = 200
export const PLAYER_MAX_HP = 20
export const PLAYER_ATTACK_RANGE = 90
export const PLAYER_ATTACK_COOLDOWN_MS = 260
export const PLAYER_HIT_COOLDOWN_MS = 0
export const IDLE_ANIM_FRAME_RATE = 3

// Monsters
export const MONSTER_SPAWN_DELAY = 1000
export const SPIDER_MAX_HP = 6
export const SPIDER_SPEED = 140

export const BRUTE_MAX_HP = 12
export const BRUTE_SPEED = 80

export const GHOST_MAX_HP = 8
export const GHOST_SPEED = 155

// Monster Attack Stats
export const SPIDER_ATTACK_RANGE = 70
export const SPIDER_WINDUP_MS = 400
export const SPIDER_ATTACK_COOLDOWN = 1200

export const BRUTE_ATTACK_RANGE = 100
export const BRUTE_WINDUP_MS = 1000
export const BRUTE_ATTACK_COOLDOWN = 1500

export const GHOST_ATTACK_RANGE = 85
export const GHOST_WINDUP_MS = 650
export const GHOST_ATTACK_COOLDOWN = 1500

export const BOSS_ATTACK_RANGE = 120
export const BOSS_WINDUP_MS = 1000
export const BOSS_ATTACK_COOLDOWN = 1000

// Trees
export const TREE_COUNT = 50
export const TREE_INTERACT_RADIUS = 80

// Merchant
export const MERCHANT_INTERACT_RADIUS = 70
export const WOOD_TO_COIN_RATE = 2



// Items shop
export const ITEM_PRICES: Record<string, number> = {
  sword: 5,
  bow: 8,
  pickaxe: 4,
  axe: 3,
  hammer: 12,
}

export const SHOP_ITEMS = [
  { key: "sword", label: "Sword", desc: "Melee weapon" },
  { key: "bow", label: "Bow", desc: "Ranged weapon" },
  { key: "pickaxe", label: "Pickaxe", desc: "Mine resources" },
  { key: "axe", label: "Axe", desc: "Chop faster" },
  { key: "hammer", label: "Hammer", desc: "Heavy hitter" },
]

// World Gen
export const GROUND_TILES = ["ground", "ground", "ground", "ground", "grass", "grass", "flower-grass"]
