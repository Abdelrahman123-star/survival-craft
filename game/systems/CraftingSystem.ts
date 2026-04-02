import { Player } from "../entities/Player"
import { ITEMS } from "../config/items"

export interface Recipe {
  id: string
  outputItemId: string
  outputQty: number
  pattern: (string | null)[][]
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
      pattern: [["wood"]],
    },
    {
      id: "planks_to_sticks",
      outputItemId: "stick",
      outputQty: 4,
      pattern: [
        ["wood-planks"],
        ["wood-planks"],
      ],
    },
    {
      id: "wooden_sword",
      outputItemId: "wooden-sword",
      outputQty: 1,
      pattern: [
        ["wood-planks"],
        ["wood-planks"],
        ["stick"],
      ],
    },
    {
      id: "wooden_axe",
      outputItemId: "wooden-axe",
      outputQty: 1,
      pattern: [
        ["wood-planks", "wood-planks"],
        ["wood-planks", "stick"],
        [null, "stick"],
      ],
    },
    {
      id: "wooden_pickaxe",
      outputItemId: "wooden-pickaxe",
      outputQty: 1,
      pattern: [
        ["wood-planks", "wood-planks", "wood-planks"],
        [null, "stick", null],
        [null, "stick", null],
      ],
    },
    {
      id: "wood_bow",
      outputItemId: "basic-bow",
      outputQty: 1,
      pattern: [
        [null, "spider-web", "wood-planks"],
        ["spider-web", null, "wood-planks"],
        [null, "spider-web", "wood-planks"],
      ],
    },
  ]

  // ── Public ──────────────────────────────────────────────────────────────────

  getRecipes(): Recipe[] {
    return [...this.recipes]
  }

  checkRecipe(grid: CraftingGrid): Recipe | null {
    const idGrid = grid.map(row => row.map(s => (s ? s.itemId : null)))
    if (this.getFilledItems(idGrid).length === 0) return null
    for (const recipe of this.recipes) {
      const matched = recipe.isShapeless
        ? this.matchShapeless(this.getFilledItems(idGrid), recipe)
        : this.matchShaped(idGrid, recipe)
      if (matched) return recipe
    }
    return null
  }

  /** How many times can this recipe be crafted given current grid contents. */
  maxCraftCount(grid: CraftingGrid, recipe: Recipe): number {
    const available = new Map<string, number>()
    for (const row of grid)
      for (const slot of row)
        if (slot) available.set(slot.itemId, (available.get(slot.itemId) ?? 0) + slot.count)

    const required = new Map<string, number>()
    for (const cell of recipe.pattern.flat())
      if (cell) required.set(cell, (required.get(cell) ?? 0) + 1)

    let max = Infinity
    for (const [id, need] of required)
      max = Math.min(max, Math.floor((available.get(id) ?? 0) / need))

    return isFinite(max) ? max : 0
  }

  /**
   * Consume ingredients from the grid for `times` crafts.
   * Mutates the grid in place — call only after successfully adding output to inventory.
   */
  consumeIngredients(grid: CraftingGrid, recipe: Recipe, times: number): void {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[r][c]) {
          grid[r][c]!.count -= times
          if (grid[r][c]!.count <= 0) grid[r][c] = null
        }
      }
    }
  }

  /**
   * Full craft attempt.
   * - Checks recipe, checks ingredient counts, adds output to player inventory,
   *   then consumes the correct amount from the grid.
   * - Returns error string on any failure.
   * - `all = true` → craft as many times as ingredients allow.
   */
  craft(
    player: Player,
    grid: CraftingGrid,
    all = false
  ): { item: any; qty: number; consumedCount: number } | string {
    const recipe = this.checkRecipe(grid)
    if (!recipe) return "❌ No recipe matches!"

    const output = ITEMS[recipe.outputItemId]
    if (!output) return "❌ Item not found!"

    const times = all ? this.maxCraftCount(grid, recipe) : 1
    if (times === 0) return "❌ Not enough ingredients!"

    const ok = player.inventory.addItem(output, recipe.outputQty * times)
    if (!ok) return "❌ Inventory full!"

    this.consumeIngredients(grid, recipe, times)
    return { item: output, qty: recipe.outputQty * times, consumedCount: times }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private getFilledItems(grid: (string | null)[][]): string[] {
    return grid.flat().filter((x): x is string => x !== null)
  }

  private matchShapeless(items: string[], recipe: Recipe): boolean {
    const pat = recipe.pattern.flat().filter((x): x is string => x !== null)
    if (items.length !== pat.length) return false
    return [...items].sort().every((v, i) => v === [...pat].sort()[i])
  }

  private matchShaped(grid: (string | null)[][], recipe: Recipe): boolean {
    const pRows = recipe.pattern.length
    const pCols = recipe.pattern[0].length
    // Grid must have exactly the same number of filled cells as the pattern
    if (this.getFilledItems(grid).length !== this.getFilledItems(recipe.pattern).length) return false

    for (let r = 0; r <= 3 - pRows; r++) {
      for (let c = 0; c <= 3 - pCols; c++) {
        if (this.checkAtPos(grid, recipe.pattern, r, c)) return true
      }
    }
    return false
  }

  private checkAtPos(
    grid: (string | null)[][],
    pattern: (string | null)[][],
    startR: number,
    startC: number
  ): boolean {
    // Cells inside the pattern window must match exactly
    for (let r = 0; r < pattern.length; r++)
      for (let c = 0; c < pattern[r].length; c++)
        if (grid[startR + r][startC + c] !== pattern[r][c]) return false

    // Cells outside the window must all be empty
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const inside = r >= startR && r < startR + pattern.length
          && c >= startC && c < startC + pattern[0].length
        if (!inside && grid[r][c] !== null) return false
      }

    return true
  }
}