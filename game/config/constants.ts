// World
export const WORLD_SIZE = 1500
export const PLAYER_SPEED = 200
export const PLAYER_MAX_HP = 20
export const PLAYER_ATTACK_RANGE = 90
export const PLAYER_ATTACK_COOLDOWN_MS = 260
export const PLAYER_HIT_COOLDOWN_MS = 450

// Monsters
export const MONSTER_SPAWN_DELAY = 3000
export const SPIDER_MAX_HP = 6
export const BRUTE_MAX_HP = 12
export const BRUTE_SPEED = 80
export const SPIDER_SPEED = 140
export const GHOST_MAX_HP = 8
export const GHOST_SPEED = 155

// Trees
export const TREE_COUNT = 50
export const TREE_INTERACT_RADIUS = 80

// Merchant
export const MERCHANT_INTERACT_RADIUS = 70
export const WOOD_TO_COIN_RATE = 2



// Items
export const ITEM_PRICES: Record<string, number> = {
  sword: 5,
  bow: 8,
  pickaxe: 4,
  axe: 3,
}

export const SHOP_ITEMS = [
  { key: "sword", label: "Sword", desc: "Melee weapon" },
  { key: "bow", label: "Bow", desc: "Ranged weapon" },
  { key: "pickaxe", label: "Pickaxe", desc: "Mine resources" },
  { key: "axe", label: "Axe", desc: "Chop faster" },
]

// World Gen
export const GROUND_TILES = ["ground", "ground", "ground", "ground", "grass", "grass", "flower-grass"]