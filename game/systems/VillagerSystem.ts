import * as Phaser from "phaser"
import { Villager } from "../entities/Villager"
import { QuestSystem, Quest } from "./QuestSystem"
import { QuestUI } from "../ui/QuestUI"
import { Player } from "../entities/Player"

export const VILLAGER_CONFIG = [
    { id: 'worker', name: 'Worker', texture: 'villager-worker', x: 950, y: 750 },
    { id: 'smith', name: 'Blacksmith', texture: 'villager-smith', x: 1000, y: 1050 },
    { id: 'OldLady', name: 'Old Lady', texture: 'villager-oldlady', x: 600, y: 650 },
    { id: 'YoungLady', name: 'Young Lady', texture: 'villager-younglady', x: 1000, y: 650 }
]

export class VillagerSystem {
    private scene: Phaser.Scene
    private villagers: Villager[] = []
    private questSystem: QuestSystem
    private villagerGroup: Phaser.Physics.Arcade.Group
    private questUI: QuestUI

    constructor(scene: Phaser.Scene, questSystem: QuestSystem, questUI: QuestUI) {
        this.scene = scene
        this.questSystem = questSystem
        this.questUI = questUI
        this.villagerGroup = scene.physics.add.group()
        this.spawnVillagers()
    }

    private spawnVillagers() {
        VILLAGER_CONFIG.forEach(cfg => {
            const v = new Villager(this.scene, cfg.x, cfg.y, cfg.id, cfg.name, cfg.texture)
            this.villagers.push(v)
            this.villagerGroup.add(v.sprite)
        })
    }

    public update() {
        // Update quest markers for all villagers
        this.villagers.forEach(v => {
            const q = this.questSystem.getQuestForVillager(v.id)
            if (!q) {
                v.updateMarker('none')
            } else {
                v.updateMarker(q.status === 'available' ? 'available' : 'active')
            }
        })
    }

    public handleInteraction(player: Player): boolean {
        if (this.questUI.isOpenNow()) return false

        for (const v of this.villagers) {
            const dist = Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, v.x, v.y)
            if (dist < 80) {
                const quest = this.questSystem.getQuestForVillager(v.id)
                if (quest) {
                    this.questUI.show(quest, {
                        onAccept: (q) => this.questSystem.acceptQuest(q.id),
                        onClaim: (q) => this.questSystem.claimReward(q.id, player)
                    })
                    return true
                }
            }
        }
        return false
    }

    public isAnyUIOpen(): boolean {
        return this.questUI.isOpenNow()
    }

    public getVillagerGroup(): Phaser.Physics.Arcade.Group {
        return this.villagerGroup
    }
}
