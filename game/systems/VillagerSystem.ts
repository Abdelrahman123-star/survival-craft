import * as Phaser from "phaser"
import { Villager } from "../entities/Villager"
import { QuestSystem, Quest } from "./QuestSystem"
import { QuestUI } from "../ui/QuestUI"
import { Player } from "../entities/Player"

import { Random } from "../utils/Random"

export class VillagerSystem {
    private scene: Phaser.Scene
    private villagers: Villager[] = []
    private questSystem: QuestSystem
    private villagerGroup: Phaser.Physics.Arcade.Group
    private questUI: QuestUI
    private seed: string
    private villagePos: { x: number, y: number }

    constructor(scene: Phaser.Scene, questSystem: QuestSystem, questUI: QuestUI, seed: string, villagePos: { x: number, y: number }) {
        this.scene = scene
        this.questSystem = questSystem
        this.questUI = questUI
        this.seed = seed
        this.villagePos = villagePos
        this.villagerGroup = scene.physics.add.group()
        this.spawnVillagers()
    }

    private spawnVillagers() {
        const rand = new Random(this.seed + "_villagers")
        const configs = [
            { id: 'villager_0', name: 'Worker', texture: 'villager-worker' },
            { id: 'villager_1', name: 'Blacksmith', texture: 'villager-smith' },
            { id: 'villager_2', name: 'Old Lady', texture: 'villager-oldlady' },
            { id: 'villager_3', name: 'Young Lady', texture: 'villager-younglady' }
        ]

        configs.forEach((cfg, i) => {
            // Deterministic offsets around center
            const angle = (i / configs.length) * Math.PI * 2
            const dist = 100 + rand.nextInt(0, 50)
            const vx = this.villagePos.x + Math.cos(angle) * dist
            const vy = this.villagePos.y + Math.sin(angle) * dist

            const v = new Villager(this.scene, vx, vy, cfg.id, cfg.name, cfg.texture)
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
