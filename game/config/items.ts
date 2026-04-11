import { Item } from "../entities/Inventory"

export const ITEMS: Record<string, Item> = {


  'basic-bow': {
    id: 'basic-bow',
    name: 'Basic Bow',
    description: 'A simple ranged weapon',
    type: 'weapon',
    icon: 'bow',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 1,
      value: 15
    }
  },

  'hammer': {
    id: 'hammer',
    name: 'Hammer',
    description: 'Heavy hitter, slow swing',
    type: 'weapon',
    icon: 'hammer',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 6,
      cooldown: 600,
      knockback: 450,
      value: 12
    }
  },


  // Tools
  // Pickaxes 
  'stonePickaxe': {
    id: 'stonePickaxe',
    name: 'Stone Pickaxe',
    description: 'Good for mining',
    type: 'tool',
    icon: 'stonePickaxe',
    stackable: false,
    maxStack: 1,
    properties: {
      miningPower: 4,
      damage: 3,
      value: 8
    }
  },
  'woodenPickaxe': {
    id: 'woodenPickaxe',
    name: 'Wooden Pickaxe',
    description: 'A basic pickaxe',
    type: 'tool',
    icon: 'woodenPickaxe', // Placeholder icon if wooden is missing, but user said they added them
    stackable: false,
    maxStack: 1,
    properties: {
      miningPower: 2,
      damage: 2,
      value: 4
    }
  },
  'ironPickaxe': {
    id: 'ironPickaxe',
    name: 'Iron Pickaxe',
    description: 'High tier mining tool',
    type: 'tool',
    icon: 'ironPickaxe', // Placeholder
    stackable: false,
    maxStack: 1,
    properties: {
      miningPower: 8,
      damage: 5,
      value: 20
    }
  },
  // Axes
  'woodenAxe': {
    id: 'woodenAxe',
    name: 'Wooden Axe',
    description: 'A basic axe',
    type: 'tool',
    icon: 'woodenAxe', // Placeholder
    stackable: false,
    maxStack: 1,
    properties: {
      choppingPower: 2,
      damage: 2,
      value: 5
    }
  },
  'stoneAxe': {
    id: 'stoneAxe',
    name: 'Stone Axe',
    description: 'Chops trees efficiently',
    type: 'tool',
    icon: 'stoneAxe',
    stackable: false,
    maxStack: 1,
    properties: {
      choppingPower: 4,
      damage: 3,
      value: 30
    }
  },
  'ironAxe': {
    id: 'ironAxe',
    name: 'Iron Axe',
    description: 'Chops trees very fast',
    type: 'tool',
    icon: 'ironAxe',
    stackable: false,
    maxStack: 1,
    properties: {
      choppingPower: 7,
      damage: 5,
      value: 40
    }
  },


  // Swords

  // Weapons
  'woodenSword': {
    id: 'woodenSword',
    name: 'Wooden Sword',
    description: 'A basic sword made of wood',
    type: 'weapon',
    icon: 'woodenSword',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 3,
      value: 10
    }
  },
  'stoneSword': {
    id: 'stoneSword',
    name: 'Stone Sword',
    description: 'A basic sword made of wood',
    type: 'weapon',
    icon: 'stoneSword',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 5,
      value: 10
    }
  },
  'ironSword': {
    id: 'ironSword',
    name: 'Iron Sword',
    description: 'A basic sword made of wood',
    type: 'weapon',
    icon: 'ironSword',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 7,
      value: 10
    }
  },
  // Consumables
  'health-potion': {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'Restores 50 HP',
    type: 'consumable',
    icon: 'potion-red',
    stackable: true,
    maxStack: 10,
    properties: {
      healAmount: 50,
      value: 25
    }
  },

  'mana-potion': {
    id: 'mana-potion',
    name: 'Mana Potion',
    description: 'Restores 30 MP',
    type: 'consumable',
    icon: 'potion-blue',
    stackable: true,
    maxStack: 10,
    properties: {
      manaAmount: 30,
      value: 20
    }
  },

  // Materials
  'wood': {
    id: 'wood',
    name: 'Wood',
    description: 'Basic building material',
    type: 'material',
    icon: 'tree_bottom',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 1
    }
  },

  'wood-planks': {
    id: 'wood-planks',
    name: 'Wood Planks',
    description: 'Refined wood for building and crafting',
    type: 'material',
    icon: 'wood-planks',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 2
    }
  },

  'stick': {
    id: 'stick',
    name: 'Stick',
    description: 'A simple wooden stick',
    type: 'material',
    icon: 'stick',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 1
    }
  },

  'iron-ore': {
    id: 'iron-ore',
    name: 'Iron Ore',
    description: 'Needs smelting',
    type: 'material',
    icon: 'iron-ore',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 5
    }
  },

  'iron-bar': {
    id: 'iron-bar',
    name: 'Iron Bar',
    description: 'Refined iron for crafting',
    type: 'material',
    icon: 'iron-bar',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 15
    }
  },

  'boss-key': {
    id: 'boss-key',
    name: 'Secret Key',
    description: 'Opens the Desert secret boss door',
    type: 'quest',
    icon: 'boss-key',
    stackable: false,
    maxStack: 1,
    properties: {
      value: 0
    }
  },

  'crafting-table': {
    id: 'crafting-table',
    name: 'Crafting Table',
    description: 'Used for advanced 3x3 crafting',
    type: 'tool', // Treated as tool/material for placement
    icon: 'crafting-table',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 10
    }
  },

  // Loot Items
  'spider-web': {
    id: 'spider-web',
    name: 'Spider Web',
    description: 'Sticky and strong silk',
    type: 'material',
    icon: 'spider-web',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 3
    }
  },
  'spider-eye': {
    id: 'spider-eye',
    name: 'Spider Eye',
    description: 'A creepy, multifaceted eye',
    type: 'material',
    icon: 'spider-eye',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 5
    }
  },
  'feather': {
    id: 'feather',
    name: 'Feather',
    description: 'A soft, light feather',
    type: 'material',
    icon: 'feather',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 2
    }
  },
  'stone-block': {
    id: 'stone-block',
    name: 'Stone Block',
    description: 'Solid stone for crafting',
    type: 'material',
    icon: 'stone-block',
    stackable: true,
    maxStack: 99,
    properties: {
      value: 3
    }
  },
  'chicken-leg': {
    id: 'chicken-leg',
    name: 'Chicken Leg',
    description: 'A tasty drumstick dropped by animals.',
    type: 'consumable',
    icon: 'chickenLeg',
    stackable: true,
    maxStack: 99,
    properties: {
      healAmount: 15,
      value: 5
    }
  }
}