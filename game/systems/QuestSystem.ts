import * as Phaser from "phaser"
import { Player } from "../entities/Player"

export interface Quest {
    id: string
    description: string
    targetCount: number
    currentCount: number
    xpReward: number
    type: "kill" | "chop"
    targetType?: string // e.g., "spider"
}

export class QuestSystem {
    private activeQuests: Quest[] = []
    private scene: Phaser.Scene
    private onQuestCompleted?: (quest: Quest) => void

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.generateInitialQuests()
    }

    private generateInitialQuests() {
        this.activeQuests.push({
            id: "kill-spiders",
            description: "Kill 5 Spiders",
            targetCount: 5,
            currentCount: 0,
            xpReward: 50,
            type: "kill",
            targetType: "spider"
        })

        this.activeQuests.push({
            id: "chop-trees",
            description: "Chop 10 Trees",
            targetCount: 10,
            currentCount: 0,
            xpReward: 60,
            type: "chop"
        })
    }

    public updateProgress(type: "kill" | "chop", targetType?: string, amount: number = 1, player?: Player) {
        this.activeQuests.forEach(quest => {
            if (quest.type === type && (!quest.targetType || quest.targetType === targetType)) {
                if (quest.currentCount < quest.targetCount) {
                    quest.currentCount += amount
                    if (quest.currentCount >= quest.targetCount) {
                        this.completeQuest(quest, player)
                    }
                }
            }
        })
    }

    private completeQuest(quest: Quest, player?: Player) {
        if (player) {
            player.addXp(quest.xpReward)
        }

        // Show quest complete notification
        this.showQuestCompleteNotification(quest)

        // Remove old quest and add a replacement
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id)
        this.generateReplacementQuest(quest.type)

        if (this.onQuestCompleted) {
            this.onQuestCompleted(quest)
        }
    }

    private generateReplacementQuest(type: string) {
        if (type === "kill") {
            const monsters = ["spider", "ghost", "brute"]
            const target = monsters[Math.floor(Math.random() * monsters.length)]
            const count = target === "spider" ? 5 : (target === "ghost" ? 3 : 1)
            this.activeQuests.push({
                id: `kill-${target}-${Date.now()}`,
                description: `Kill ${count} ${target.charAt(0).toUpperCase() + target.slice(1)}s`,
                targetCount: count,
                currentCount: 0,
                xpReward: count * 15 + 20,
                type: "kill",
                targetType: target
            })
        } else {
            const count = 5 + Math.floor(Math.random() * 10)
            this.activeQuests.push({
                id: `chop-trees-${Date.now()}`,
                description: `Chop ${count} Trees`,
                targetCount: count,
                currentCount: 0,
                xpReward: count * 5 + 10,
                type: "chop"
            })
        }
    }

    private showQuestCompleteNotification(quest: Quest) {
        const cam = this.scene.cameras.main
        const text = this.scene.add.text(cam.width - 200, 100, `Quest Complete:\n${quest.description}`, {
            fontSize: "20px",
            color: "#00FF00",
            backgroundColor: "#00000099",
            padding: { x: 10, y: 5 },
            align: "right"
        }).setScrollFactor(0).setDepth(100).setOrigin(1, 0)

        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: 50,
            delay: 3000,
            duration: 1000,
            onComplete: () => text.destroy()
        })
    }

    public getActiveQuests(): Quest[] {
        return this.activeQuests
    }

    public setOnQuestCompleted(callback: (quest: Quest) => void) {
        this.onQuestCompleted = callback
    }
}
