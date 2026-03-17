export interface Item {
    id: string
    name: string
    description: string
    type: 'weapon' | 'tool' | 'consumable' | 'material' | 'quest'
    icon: string // The texture key
    stackable: boolean
    maxStack: number
    properties: {
      damage?: number
      defense?: number
      healAmount?: number
      value?: number
      [key: string]: any
    }
  }
  
  export interface InventorySlot {
    item: Item | null
    quantity: number
  }
  
  export class Inventory {
    private slots: InventorySlot[]
    private maxSlots: number
    private gold: number = 0
    
    constructor(maxSlots: number = 20) {
      this.maxSlots = maxSlots
      this.slots = Array(maxSlots).fill(null).map(() => ({ item: null, quantity: 0 }))
    }
  
    addItem(item: Item, quantity: number = 1): boolean {
      // Try to stack with existing items first
      if (item.stackable) {
        for (let i = 0; i < this.slots.length; i++) {
          const slot = this.slots[i]
          if (slot.item?.id === item.id && slot.quantity < item.maxStack) {
            const spaceInStack = item.maxStack - slot.quantity
            const amountToAdd = Math.min(spaceInStack, quantity)
            slot.quantity += amountToAdd
            quantity -= amountToAdd
            
            if (quantity === 0) return true
          }
        }
      }
      
      // Find empty slots for remaining items
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].item === null) {
          const amountToAdd = Math.min(item.maxStack || 1, quantity)
          this.slots[i] = {
            item: { ...item },
            quantity: amountToAdd
          }
          quantity -= amountToAdd
          
          if (quantity === 0) return true
        }
      }
      
      return quantity === 0 // Return false if we couldn't add all items
    }
  
    removeItem(slotIndex: number, quantity: number = 1): boolean {
      const slot = this.slots[slotIndex]
      if (!slot.item) return false
      
      if (slot.quantity <= quantity) {
        // Remove the entire stack
        this.slots[slotIndex] = { item: null, quantity: 0 }
      } else {
        // Reduce quantity
        slot.quantity -= quantity
      }
      
      return true
    }
  
    getItem(slotIndex: number): InventorySlot | null {
      return this.slots[slotIndex] || null
    }
  
    getAllSlots(): InventorySlot[] {
      return [...this.slots]
    }

  countItem(itemId: string): number {
    let total = 0
    for (const slot of this.slots) {
      if (slot.item?.id === itemId) total += slot.quantity
    }
    return total
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.countItem(itemId) >= quantity
  }

  removeItemById(itemId: string, quantity: number): boolean {
    if (quantity <= 0) return true
    if (!this.hasItem(itemId, quantity)) return false

    let remaining = quantity
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]
      if (remaining <= 0) break
      if (slot.item?.id !== itemId) continue

      const take = Math.min(slot.quantity, remaining)
      this.removeItem(i, take)
      remaining -= take
    }
    return remaining <= 0
  }
  
    addGold(amount: number): void {
      this.gold += amount
    }
  
    removeGold(amount: number): boolean {
      if (this.gold >= amount) {
        this.gold -= amount
        return true
      }
      return false
    }
  
    getGold(): number {
      return this.gold
    }
  
    swapSlots(fromIndex: number, toIndex: number): void {
      if (fromIndex === toIndex) return
      
      const temp = { ...this.slots[fromIndex] }
      this.slots[fromIndex] = { ...this.slots[toIndex] }
      this.slots[toIndex] = temp
    }
  }