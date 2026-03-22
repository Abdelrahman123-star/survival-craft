import { Item } from "../entities/Inventory"

export const ITEMS: Record<string, Item> = {
  // Weapons
  'wooden-sword': {
    id: 'wooden-sword',
    name: 'Wooden Sword',
    description: 'A basic sword made of wood',
    type: 'weapon',
    icon: 'wood-sword',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 3,
      value: 10
    }
  },

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

  'iron-sword': {
    id: 'iron-sword',
    name: 'Iron Sword',
    description: 'A sturdy iron blade',
    type: 'weapon',
    icon: 'iron-sword',
    stackable: false,
    maxStack: 1,
    properties: {
      damage: 12,
      value: 50
    }
  },

  // Tools
  'wooden-pickaxe': {
    id: 'wooden-pickaxe',
    name: 'Wooden Pickaxe',
    description: 'Good for basic mining',
    type: 'tool',
    icon: 'pickaxe',
    stackable: false,
    maxStack: 1,
    properties: {
      miningPower: 2,
      value: 8
    }
  },

  'iron-axe': {
    id: 'iron-axe',
    name: 'Iron Axe',
    description: 'Chops trees efficiently',
    type: 'tool',
    icon: 'axe',
    stackable: false,
    maxStack: 1,
    properties: {
      choppingPower: 5,
      value: 30
    }
  },

  'wooden-axe': {
    id: 'wooden-axe',
    name: 'Wooden Axe',
    description: 'A basic axe for chopping trees',
    type: 'tool',
    icon: 'axe',
    stackable: false,
    maxStack: 1,
    properties: {
      choppingPower: 2,
      value: 5
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
  }
}