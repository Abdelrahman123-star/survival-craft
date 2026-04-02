export interface LootEntry {
    itemId: string
    chance: number // 0 to 1 (0% to 100%)
    min: number
    max: number
}

export const LOOT_TABLES: Record<string, LootEntry[]> = {
    spider: [
        { itemId: 'spider-web', chance: 0.35, min: 1, max: 1 },
        { itemId: 'spider-eye', chance: 0.20, min: 1, max: 1 }
    ],
    brute: [ // The "big spider" uses brute type
        { itemId: 'spider-web', chance: 0.70, min: 1, max: 2 },
        { itemId: 'spider-eye', chance: 0.50, min: 1, max: 2 }
    ],
    ghost: [
        { itemId: 'feather', chance: 0.40, min: 1, max: 1 }
    ]
}
