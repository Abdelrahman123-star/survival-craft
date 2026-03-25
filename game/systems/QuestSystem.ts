import * as Phaser from "phaser"
import { Player } from "../entities/Player"

export interface Quest {
    id: string
    villagerId?: string // Link to a villager
    description: string
    targetCount: number
    currentCount: number
    xpReward: number
    type: "kill" | "chop" | "collect"
    targetType?: string // e.g., "spider" or "wood"
    status: 'available' | 'active' | 'completed' | 'claimed'
}

export class QuestSystem {
    private allQuests: Quest[] = []
    private scene: Phaser.Scene
    private onQuestCompleted?: (quest: Quest) => void

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.generateInitialQuests()
    }

    private generateInitialQuests() {
        // These will be "available" quests offered by villagers
        this.allQuests.push({
            id: "wood-quest",
            villagerId: "worker",
            description: "Collect 10 Wood",
            targetCount: 10,
            currentCount: 0,
            xpReward: 50,
            type: "collect",
            targetType: "wood",
            status: 'available'
        })

        this.allQuests.push({
            id: "kill-quest",
            villagerId: "smith",
            description: "Kill 5 Spiders",
            targetCount: 5,
            currentCount: 0,
            xpReward: 60,
            type: "kill",
            targetType: "spider",
            status: 'available'
        })

        this.allQuests.push({
            id: "chop-quest-lady",
            villagerId: "OldLady",
            description: "Chop 15 Trees",
            targetCount: 15,
            currentCount: 0,
            xpReward: 100,
            type: "chop",
            status: 'available'
        })

        this.allQuests.push({
            id: "kill-quest-young",
            villagerId: "YoungLady",
            description: "Kill 3 Ghosts",
            targetCount: 3,
            currentCount: 0,
            xpReward: 120,
            type: "kill",
            targetType: "ghost",
            status: 'available'
        })
    }

    public updateProgress(type: "kill" | "chop" | "collect", targetType?: string, amount: number = 1, player?: Player) {
        this.allQuests.forEach(quest => {
            if (quest.status === 'active' && quest.type === type && (!quest.targetType || quest.targetType === targetType)) {
                if (quest.currentCount < quest.targetCount) {
                    quest.currentCount += amount
                    if (quest.currentCount >= quest.targetCount) {
                        quest.status = 'completed'
                        this.showQuestCompleteNotification(quest)
                    }
                }
            }
        })
    }

    public acceptQuest(id: string) {
        const quest = this.allQuests.find(q => q.id === id)
        if (quest && quest.status === 'available') {
            quest.status = 'active'
        }
    }

    public claimReward(id: string, player: Player) {
        const questIndex = this.allQuests.findIndex(q => q.id === id)
        if (questIndex !== -1) {
            const quest = this.allQuests[questIndex]
            if (quest.status === 'completed') {
                player.addXp(quest.xpReward)
                quest.status = 'claimed'
                // Optional: remove or keep as claimed
                if (this.onQuestCompleted) {
                    this.onQuestCompleted(quest)
                }
            }
        }
    }

    private showQuestCompleteNotification(quest: Quest) {
        const cam = this.scene.cameras.main
        const text = this.scene.add.text(cam.width - 200, 100, `Quest Ready to Claim:\n${quest.description}\nReturn to Villager!`, {
            fontSize: "20px",
            color: "#FFFF00",
            backgroundColor: "#00000099",
            padding: { x: 10, y: 5 },
            align: "right"
        }).setScrollFactor(0).setDepth(100).setOrigin(1, 0)

        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: 50,
            delay: 4000,
            duration: 1000,
            onComplete: () => text.destroy()
        })
    }

    public getQuestForVillager(villagerId: string): Quest | undefined {
        return this.allQuests.find(q => q.villagerId === villagerId && q.status !== 'claimed')
    }

    public getActiveQuests(): Quest[] {
        return this.allQuests.filter(q => q.status === 'active')
    }

    public setOnQuestCompleted(callback: (quest: Quest) => void) {
        this.onQuestCompleted = callback
    }
}
