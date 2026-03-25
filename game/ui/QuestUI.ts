import * as Phaser from "phaser"
import { Quest } from "../systems/QuestSystem"

/**
 * QuestUI — Dark Fantasy Panel
 * Full redesign: dramatic parchment-style quest card with
 * glowing reward badge, animated runes, and crisp CTA buttons.
 */
export class QuestUI {
    private scene: Phaser.Scene
    private container: Phaser.GameObjects.Container
    private overlay: Phaser.GameObjects.Rectangle

    // Panel graphics layers
    private shadowLayer: Phaser.GameObjects.Graphics
    private bgPanel: Phaser.GameObjects.Graphics
    private headerBand: Phaser.GameObjects.Graphics
    private divider: Phaser.GameObjects.Graphics
    private accentCorners: Phaser.GameObjects.Graphics

    // Text elements
    private statusBadge: Phaser.GameObjects.Text
    private questTitle: Phaser.GameObjects.Text
    private questDesc: Phaser.GameObjects.Text

    // Reward section
    private rewardBox: Phaser.GameObjects.Graphics
    private rewardIcon: Phaser.GameObjects.Text
    private rewardAmount: Phaser.GameObjects.Text
    private rewardLabel: Phaser.GameObjects.Text

    // Buttons
    private acceptBtn: Phaser.GameObjects.Container
    private declineBtn: Phaser.GameObjects.Container
    private claimBtn: Phaser.GameObjects.Container
    private closeBtn: Phaser.GameObjects.Container

    // State
    private currentQuest: Quest | null = null
    private onAccept?: (q: Quest) => void
    private onReject?: () => void
    private onClaim?: (q: Quest) => void
    private isOpen = false
    private floatTween?: Phaser.Tweens.Tween
    private glowTween?: Phaser.Tweens.Tween

    // Panel dimensions
    private readonly W = 460
    private readonly H = 340
    private readonly HALF_W = 230
    private readonly HALF_H = 170

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        const cam = scene.cameras.main

        // ── Darkened Overlay ──────────────────────────────────────────────
        this.overlay = scene.add
            .rectangle(cam.centerX, cam.centerY, cam.width, cam.height, 0x000000, 0.7)
            .setScrollFactor(0)
            .setDepth(1000)
            .setVisible(false)
            .setInteractive() // block clicks behind panel
            this.overlay.disableInteractive()
        // ── Main Container ────────────────────────────────────────────────
        this.container = scene.add.container(cam.centerX, cam.centerY)
        this.container.setScrollFactor(0).setDepth(1001)
        this.container.setVisible(false).setAlpha(0).setScale(0.88)

        // Build layers bottom→top
        this.shadowLayer = scene.add.graphics()
        this.bgPanel = scene.add.graphics()
        this.headerBand = scene.add.graphics()
        this.divider = scene.add.graphics()
        this.accentCorners = scene.add.graphics()

        this.drawPanel()

        this.container.add([
            this.shadowLayer,
            this.bgPanel,
            this.headerBand,
            this.divider,
            this.accentCorners,
        ])

        // ── Status Badge (top-left ribbon) ────────────────────────────────
        const badgeBg = scene.add.graphics()
        badgeBg.fillStyle(0x1a0a00, 1)
        badgeBg.fillRoundedRect(-this.HALF_W + 16, -this.HALF_H - 14, 140, 28, 6)
        badgeBg.lineStyle(1, 0xc8922a, 0.6)
        badgeBg.strokeRoundedRect(-this.HALF_W + 16, -this.HALF_H - 14, 140, 28, 6)
        this.container.add(badgeBg)

        this.statusBadge = scene.add.text(-this.HALF_W + 86, -this.HALF_H, "◆  QUEST AVAILABLE", {
            fontFamily: "Alagard",
            fontSize: "14px",
            color: "#c8922a",
        }).setOrigin(0.5)
        this.container.add(this.statusBadge)

        // ── Quest Title ───────────────────────────────────────────────────
        this.questTitle = scene.add.text(0, -this.HALF_H + 52, "", {
            fontFamily: "Alagard",
            fontSize: "32px",
            color: "#f0d080",
            align: "center",
            stroke: "#000000",
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 0, fill: true },
        }).setOrigin(0.5)
        this.container.add(this.questTitle)

        // ── Decorative divider line ───────────────────────────────────────
        const divGfx = scene.add.graphics()
        divGfx.lineStyle(1, 0xc8922a, 0.4)
        divGfx.beginPath()
        divGfx.moveTo(-160, -this.HALF_H + 78)
        divGfx.lineTo(160, -this.HALF_H + 78)
        divGfx.strokePath()
        // small diamond accent
        divGfx.fillStyle(0xc8922a, 0.7)
        divGfx.fillTriangle(-6, -this.HALF_H + 78, 0, -this.HALF_H + 73, 6, -this.HALF_H + 78)
        divGfx.fillTriangle(-6, -this.HALF_H + 78, 0, -this.HALF_H + 83, 6, -this.HALF_H + 78)
        this.container.add(divGfx)

        // ── Description ───────────────────────────────────────────────────
        this.questDesc = scene.add.text(0, -this.HALF_H + 120, "", {
            fontFamily: "Alagard",
            fontSize: "24px",
            color: "#d4c4a0",
            align: "center",
            wordWrap: { width: 380 },
            lineSpacing: 4,
        }).setOrigin(0.5)
        this.container.add(this.questDesc)

        // ── Reward Box ────────────────────────────────────────────────────
        this.rewardBox = scene.add.graphics()
        this.drawRewardBox()
        this.container.add(this.rewardBox)

        this.rewardIcon = scene.add.text(-50, this.HALF_H - 72, "✦", {
            fontFamily: "serif",
            fontSize: "22px",
            color: "#ffe066",
        }).setOrigin(0.5)
        this.container.add(this.rewardIcon)

        this.rewardAmount = scene.add.text(-20, this.HALF_H - 72, "", {
            fontFamily: "Alagard",
            fontSize: "28px",
            color: "#ffe066",
            fontStyle: "bold",
        }).setOrigin(0, 0.5)
        this.container.add(this.rewardAmount)

        this.rewardLabel = scene.add.text(0, this.HALF_H - 52, "EXPERIENCE REWARD", {
            fontFamily: "Alagard",
            fontSize: "16px",
            color: "#8a7040",
            letterSpacing: 2,
        }).setOrigin(0.5)
        this.container.add(this.rewardLabel)

        // ── Buttons ───────────────────────────────────────────────────────
        this.acceptBtn = this.createButton(scene, -72, this.HALF_H - 20, 130, 36, "⚔  ACCEPT  [Y]", 0x1a3a1a, 0x4caf50)
        this.declineBtn = this.createButton(scene, 72, this.HALF_H - 20, 120, 36, "✕  DECLINE  [N]", 0x2a1010, 0x8b3a3a)
        this.claimBtn = this.createButton(scene, 0, this.HALF_H - 20, 200, 36, "★  CLAIM REWARD  [E]", 0x2a200a, 0xc8922a)
        this.closeBtn = this.createButton(scene, 0, this.HALF_H - 20, 160, 36, "✕  CLOSE  [N]", 0x1a1a2a, 0x5a5a8a)

        this.container.add([this.acceptBtn, this.declineBtn, this.claimBtn, this.closeBtn])

        // ── Keyboard Controls ─────────────────────────────────────────────
        scene.input.keyboard!.on("keydown-Y", () => {
            if (!this.isOpen || !this.currentQuest) return
            if (this.currentQuest.status === "available") {
                this.onAccept?.(this.currentQuest)
                this.hide()
            }
        })

        scene.input.keyboard!.on("keydown-N", () => {
            if (!this.isOpen) return
            this.onReject?.()
            this.hide()
        })

        scene.input.keyboard!.on("keydown-E", () => {
            if (!this.isOpen || !this.currentQuest) return
            if (this.currentQuest.status === "completed") {
                this.onClaim?.(this.currentQuest)
                this.hide()
            }
        })
    }

    // ─────────────────────────────────────────────────────────────────────
    // DRAW HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private drawPanel() {
        const W = this.W, H = this.H, HW = this.HALF_W, HH = this.HALF_H

        // Drop shadow (offset rectangle)
        this.shadowLayer.clear()
        this.shadowLayer.fillStyle(0x000000, 0.55)
        this.shadowLayer.fillRoundedRect(-HW + 6, -HH + 8, W, H, 14)

        // Background panel — deep parchment-dark
        this.bgPanel.clear()
        this.bgPanel.fillStyle(0x0e0a06, 0.97)
        this.bgPanel.fillRoundedRect(-HW, -HH, W, H, 12)
        // inner subtle lighter fill for warmth
        this.bgPanel.fillStyle(0x1c1308, 0.6)
        this.bgPanel.fillRoundedRect(-HW + 3, -HH + 3, W - 6, H - 6, 10)

        // Gold border — two rings
        this.bgPanel.lineStyle(2, 0xc8922a, 0.9)
        this.bgPanel.strokeRoundedRect(-HW, -HH, W, H, 12)
        this.bgPanel.lineStyle(1, 0x6b4a15, 0.5)
        this.bgPanel.strokeRoundedRect(-HW + 4, -HH + 4, W - 8, H - 8, 9)

        // Header band — slightly lighter dark area
        this.headerBand.clear()
        this.headerBand.fillStyle(0x1e1208, 0.8)
        this.headerBand.fillRect(-HW + 4, -HH + 4, W - 8, 90)

        // Horizontal divider above buttons
        this.divider.clear()
        this.divider.lineStyle(1, 0x6b4a15, 0.6)
        this.divider.beginPath()
        this.divider.moveTo(-HW + 12, HH - 44)
        this.divider.lineTo(HW - 12, HH - 44)
        this.divider.strokePath()

        // Corner accent glyphs (rune-like marks)
        this.accentCorners.clear()
        this.accentCorners.lineStyle(1, 0xc8922a, 0.45)
        const cs = 14 // corner size
        const corners = [
            [-HW + 8, -HH + 8],
            [HW - 8 - cs, -HH + 8],
            [-HW + 8, HH - 8 - cs],
            [HW - 8 - cs, HH - 8 - cs],
        ]
        for (const [cx, cy] of corners) {
            this.accentCorners.strokeRect(cx, cy, cs, cs)
        }
    }

    private drawRewardBox() {
        this.rewardBox.clear()
        this.rewardBox.fillStyle(0x0a0700, 0.85)
        this.rewardBox.fillRoundedRect(-90, this.HALF_H - 88, 180, 42, 8)
        this.rewardBox.lineStyle(1, 0xc8922a, 0.35)
        this.rewardBox.strokeRoundedRect(-90, this.HALF_H - 88, 180, 42, 8)
    }

    private createButton(
        scene: Phaser.Scene,
        x: number, y: number,
        w: number, h: number,
        label: string,
        bgColor: number,
        borderColor: number
    ): Phaser.GameObjects.Container {
        const btn = scene.add.container(x, y)

        const bg = scene.add.graphics()
        const half_w = w / 2, half_h = h / 2

        const draw = (hover: boolean) => {
            bg.clear()
            bg.fillStyle(hover ? borderColor : bgColor, hover ? 0.25 : 0.9)
            bg.fillRoundedRect(-half_w, -half_h, w, h, 6)
            bg.lineStyle(hover ? 2 : 1, borderColor, hover ? 1 : 0.7)
            bg.strokeRoundedRect(-half_w, -half_h, w, h, 6)
        }

        draw(false)

        const text = scene.add.text(0, 0, label, {
            fontFamily: "Alagard",
            fontSize: "16px",
            color: `#${borderColor.toString(16).padStart(6, "0")}`,
            letterSpacing: 1,
        }).setOrigin(0.5)

        btn.add([bg, text])

        // Hit area & hover
        btn.setSize(w, h)
        btn.setInteractive()
        btn.on("pointerover", () => {
            draw(true)
            scene.tweens.add({ targets: btn, scaleX: 1.04, scaleY: 1.04, duration: 80 })
        })
        btn.on("pointerout", () => {
            draw(false)
            scene.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 80 })
        })

        return btn
    }

    // ─────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────

    public show(
        quest: Quest,
        options: {
            onAccept?: (q: Quest) => void
            onReject?: () => void
            onClaim?: (q: Quest) => void
        }
    ) {
        this.currentQuest = quest
        this.onAccept = options.onAccept
        this.onReject = options.onReject
        this.onClaim = options.onClaim
        this.isOpen = true

        // ── Populate content ──
        this.questTitle.setText(this.getTitleFromStatus(quest))
        this.questDesc.setText(quest.description)
        this.rewardAmount.setText(`+${quest.xpReward} XP`)

        // ── Adjust rewardAmount centering (icon at -50, amount starts at -20) ──
        const totalWidth = this.rewardIcon.width + 6 + this.rewardAmount.width
        this.rewardIcon.setX(-totalWidth / 2)
        this.rewardAmount.setX(-totalWidth / 2 + this.rewardIcon.width + 6)

        // ── Status badge & buttons ──
        if (quest.status === "available") {
            this.statusBadge.setText("◆  QUEST AVAILABLE")
            this.statusBadge.setColor("#c8922a")
            this.acceptBtn.setVisible(true)
            this.declineBtn.setVisible(true)
            this.claimBtn.setVisible(false)
            this.closeBtn.setVisible(false)

        } else if (quest.status === "active") {
            this.statusBadge.setText(`◈  IN PROGRESS  ${quest.currentCount}/${quest.targetCount}`)
            this.statusBadge.setColor("#6ab0e0")
            this.acceptBtn.setVisible(false)
            this.declineBtn.setVisible(false)
            this.claimBtn.setVisible(false)
            this.closeBtn.setVisible(true)

        } else if (quest.status === "completed") {
            this.statusBadge.setText("★  QUEST COMPLETE")
            this.statusBadge.setColor("#ffe066")
            this.acceptBtn.setVisible(false)
            this.declineBtn.setVisible(false)
            this.claimBtn.setVisible(true)
            this.closeBtn.setVisible(false)
        }

        // ── Wire button clicks ──
        this.acceptBtn.removeAllListeners("pointerdown")
        this.acceptBtn.on("pointerdown", () => {
            if (!this.currentQuest) return
            this.onAccept?.(this.currentQuest)
            this.hide()
        })

        this.declineBtn.removeAllListeners("pointerdown")
        this.declineBtn.on("pointerdown", () => {
            this.onReject?.()
            this.hide()
        })

        this.claimBtn.removeAllListeners("pointerdown")
        this.claimBtn.on("pointerdown", () => {
            if (!this.currentQuest) return
            this.onClaim?.(this.currentQuest)
            this.hide()
        })

        this.closeBtn.removeAllListeners("pointerdown")
        this.closeBtn.on("pointerdown", () => {
            this.onReject?.()
            this.hide()
        })

        // ── Show ──
        this.overlay.setVisible(true)
        this.container.setVisible(true)

        this.scene.tweens.add({
            targets: this.container,
            alpha: { from: 0, to: 1 },
            scale: { from: 0.88, to: 1 },
            y: { from: this.scene.cameras.main.centerY + 18, to: this.scene.cameras.main.centerY },
            duration: 220,
            ease: "Back.Out",
        })

        // Subtle floating on title
        this.floatTween?.stop()
        this.floatTween = this.scene.tweens.add({
            targets: this.questTitle,
            y: "-=3",
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        })

        // Reward icon pulse
        this.glowTween?.stop()
        this.glowTween = this.scene.tweens.add({
            targets: this.rewardIcon,
            alpha: { from: 0.6, to: 1 },
            scale: { from: 0.95, to: 1.1 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        })
    }

    public hide() {
        this.isOpen = false
        this.floatTween?.stop()
        this.glowTween?.stop()

        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            scale: 0.9,
            y: this.scene.cameras.main.centerY + 14,
            duration: 160,
            ease: "Power2",
            onComplete: () => {
                this.container.setVisible(false)
                this.overlay.setVisible(false)
            },
        })
    }

    private getTitleFromStatus(quest: Quest): string {
        switch (quest.status) {
            case "available": return "Quest Available"
            case "active": return "Quest In Progress"
            case "completed": return "Quest Complete!"
            case "claimed": return "Reward Claimed"
            default: return "Quest"
        }
    }

    public isOpenNow(): boolean {
        return this.isOpen
    }
}