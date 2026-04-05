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

import { Random } from "../utils/Random"

export class QuestSystem {
    private allQuests: Quest[] = []
    private scene: Phaser.Scene
    private seed: string
    private onQuestCompleted?: (quest: Quest) => void

    constructor(scene: Phaser.Scene, seed: string) {
        this.scene = scene
        this.seed = seed
        this.generateInitialQuests()
    }

    private generateInitialQuests() {
        const rand = new Random(this.seed + "_quests")
        const questCounts = 4 // Number of initial quests

        // Use a list of possible quests to pick from deterministically
        const possibleQuests = [
            { id: "wood-quest", type: "collect", targetType: "wood", desc: "Collect 10 Wood", target: 10, xp: 50 },
            { id: "kill-quest", type: "kill", targetType: "spider", desc: "Kill 5 Spiders", target: 5, xp: 60 },
            { id: "chop-quest", type: "chop", desc: "Chop 15 Trees", target: 15, xp: 100 },
            { id: "ghost-quest", type: "kill", targetType: "ghost", desc: "Kill 3 Ghosts", target: 3, xp: 120 }
        ]

        // Link quests to specific villager IDs
        const villagerIds = ["villager_0", "villager_1", "villager_2", "villager_3"]

        for (let i = 0; i < questCounts; i++) {
            const qCfg = possibleQuests[i % possibleQuests.length]
            this.allQuests.push({
                id: `${qCfg.id}_${i}`,
                villagerId: villagerIds[i],
                description: qCfg.desc,
                targetCount: qCfg.target,
                currentCount: 0,
                xpReward: qCfg.xp,
                type: qCfg.type as any,
                targetType: qCfg.targetType,
                status: 'available'
            })
        }
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

    public completeAllQuests() {
        this.allQuests.forEach(quest => {
            if (quest.status === 'available' || quest.status === 'active') {
                quest.currentCount = quest.targetCount
                quest.status = 'completed'
                this.showQuestCompleteNotification(quest)
            }
        })
    }
}
