import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"

export type RecipeId = "wood_sword" | "wood_pickaxe" | "wood_axe" | "wood_bow"

export interface Recipe {
  id: RecipeId
  outputItemId: string
  outputQty: number
  woodCost: number
}

export class CraftingSystem {
  private recipes: Recipe[] = [
    { id: "wood_sword", outputItemId: "wooden-sword", outputQty: 1, woodCost: 10 },
    { id: "wood_pickaxe", outputItemId: "wooden-pickaxe", outputQty: 1, woodCost: 8 },
    { id: "wood_axe", outputItemId: "iron-axe", outputQty: 1, woodCost: 6 }, // placeholder: still uses axe texture
    { id: "wood_bow", outputItemId: "basic-bow", outputQty: 1, woodCost: 12 },
  ]

  getRecipes(): Recipe[] {
    return [...this.recipes]
  }

  craft(player: Player, recipeId: RecipeId): string {
    const recipe = this.recipes.find(r => r.id === recipeId)
    if (!recipe) return "❌ Recipe not found!"

    if (!player.inventory.hasItem("wood", recipe.woodCost)) {
      return "❌ Not enough wood!"
    }

    // remove materials
    const removed = player.inventory.removeItemById("wood", recipe.woodCost)
    if (!removed) return "❌ Not enough wood!"
    player.wood = Math.max(0, player.wood - recipe.woodCost)

    // add output
    const item = ITEMS[recipe.outputItemId]
    if (!item) return "❌ Item not found!"

    const ok = player.inventory.addItem(item, recipe.outputQty)
    if (!ok) {
      // refund
      player.inventory.addItem(ITEMS["wood"], recipe.woodCost)
      player.wood += recipe.woodCost
      return "❌ Inventory full!"
    }

    return `✅ Crafted ${item.name}!`
  }
}

