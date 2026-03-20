import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"

export interface Recipe {
  id: string
  outputItemId: string
  outputQty: number
  pattern: (string | null)[][] // 3x3 grid
  isShapeless?: boolean
}

export interface GridSlot {
  itemId: string
  count: number
}

export type CraftingGrid = (GridSlot | null)[][]

export class CraftingSystem {
  private recipes: Recipe[] = [
    {
      id: "wood_to_planks",
      outputItemId: "wood-planks",
      outputQty: 2,
      isShapeless: true,
      pattern: [["wood"]]
    },
    {
      id: "planks_to_sticks",
      outputItemId: "stick",
      outputQty: 4,
      pattern: [
        ["wood-planks"],
        ["wood-planks"]
      ]
    },
    {
      id: "wooden_sword",
      outputItemId: "wooden-sword",
      outputQty: 1,
      pattern: [
        ["wood-planks"],
        ["wood-planks"],
        ["stick"]
      ]
    },
    {
      id: "wooden_axe",
      outputItemId: "wooden-axe",
      outputQty: 1,
      pattern: [
        ["wood-planks", "wood-planks"],
        ["wood-planks", "stick"],
        [null, "stick"]
      ]
    },
    {
      id: "wooden_pickaxe",
      outputItemId: "wooden-pickaxe",
      outputQty: 1,
      pattern: [
        ["wood-planks", "wood-planks", "wood-planks"],
        [null, "stick", null],
        [null, "stick", null]
      ]
    },
    {
      id: "wood_bow",
      outputItemId: "basic-bow",
      outputQty: 1,
      pattern: [
        [null, "stick", "wood-planks"],
        ["stick", null, "wood-planks"],
        [null, "stick", "wood-planks"]
      ]
    }
  ]

  getRecipes(): Recipe[] {
    return [...this.recipes]
  }

  checkRecipe(grid: CraftingGrid): Recipe | null {
    // Convert GridSlot grid to string grid for matching
    const idGrid: (string | null)[][] = grid.map(row =>
      row.map(slot => slot ? slot.itemId : null)
    )

    const { items, rows, cols } = this.getGridBounds(idGrid)
    if (items.length === 0) return null

    for (const recipe of this.recipes) {
      if (recipe.isShapeless) {
        if (this.matchShapeless(items, recipe)) return recipe
      } else {
        if (this.matchShaped(idGrid, recipe)) return recipe
      }
    }
    return null
  }

  private getGridBounds(grid: (string | null)[][]) {
    let minR = 3, maxR = -1, minC = 3, maxC = -1
    const items: string[] = []

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c]) {
          minR = Math.min(minR, r)
          maxR = Math.max(maxR, r)
          minC = Math.min(minC, c)
          maxC = Math.max(maxC, c)
          items.push(grid[r][c]!)
        }
      }
    }

    return { items, rows: maxR - minR + 1, cols: maxC - minC + 1, minR, minC }
  }

  private matchShapeless(items: string[], recipe: Recipe): boolean {
    const patternItems = recipe.pattern.flat().filter(id => id !== null) as string[]
    if (items.length !== patternItems.length) return false

    const sortedItems = [...items].sort()
    const sortedPattern = [...patternItems].sort()

    return sortedItems.every((val, index) => val === sortedPattern[index])
  }

  private matchShaped(grid: (string | null)[][], recipe: Recipe): boolean {
    const pRows = recipe.pattern.length
    const pCols = recipe.pattern[0].length

    for (let r = 0; r <= 3 - pRows; r++) {
      for (let c = 0; c <= 3 - pCols; c++) {
        if (this.checkAtPos(grid, recipe.pattern, r, c)) {
          if (this.countGridItems(grid) === this.countPatternItems(recipe.pattern)) {
            return true
          }
        }
      }
    }
    return false
  }

  private checkAtPos(grid: (string | null)[][], pattern: (string | null)[][], startR: number, startC: number): boolean {
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        if (grid[startR + r][startC + c] !== pattern[r][c]) return false
      }
    }
    return true
  }

  private countGridItems(grid: (string | null)[][]): number {
    return grid.flat().filter(id => id !== null).length
  }

  private countPatternItems(pattern: (string | null)[][]): number {
    return pattern.flat().filter(id => id !== null).length
  }

  craft(player: Player, grid: CraftingGrid, all: boolean = false): { item: any, qty: number, consumedCount: number } | string {
    const recipe = this.checkRecipe(grid)
    if (!recipe) return "❌ No recipe matches!"

    const output = ITEMS[recipe.outputItemId]
    if (!output) return "❌ Item not found!"

    // Calculate max possible crafts if "all" is requested
    let craftCount = 1
    if (all) {
      craftCount = 999
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (grid[r][c]) {
            // Since recipe pattern currently only requires 1 of each item:
            craftCount = Math.min(craftCount, grid[r][c]!.count)
          }
        }
      }
    }

    const totalQty = recipe.outputQty * craftCount
    const ok = player.inventory.addItem(output, totalQty)
    if (!ok) return "❌ Inventory full!"

    // Return ingredients consumed count
    return { item: output, qty: totalQty, consumedCount: craftCount }
  }
}
