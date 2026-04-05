import * as Phaser from "phaser"
import { Player } from "../entities/Player"
import { WORLD_SIZE } from "../config/constants"
import { ITEMS } from "../config/items"

interface DebugOptions {
    showFPS: boolean
    showCoordinates: boolean
    showCollisionBoxes: boolean
    showGrid: boolean
    godMode: boolean
    unlimitedResources: boolean
    fastMovement: boolean
    disableDayNight: boolean
    showSpawnPoints: boolean
    showQuestDebug: boolean
}

export class DebugSystem {
    private scene: Phaser.Scene
    private options: DebugOptions
    private debugText!: Phaser.GameObjects.Text
    private fpsText!: Phaser.GameObjects.Text
    private gridGraphics!: Phaser.GameObjects.Graphics
    private panelBg!: Phaser.GameObjects.Rectangle
    private isDebugVisible: boolean = false
    private keys: Record<string, Phaser.Input.Keyboard.Key>


    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.options = {
            showFPS: true,
            showCoordinates: false,
            showCollisionBoxes: false,
            showGrid: false,
            godMode: false,
            unlimitedResources: false,
            fastMovement: false,
            disableDayNight: false,
            showSpawnPoints: false,
            showQuestDebug: false
        }

        this.keys = this.setupDebugKeys()
        this.setupDebugUI()
        this.setupConsoleCommands()
    }

    private setupDebugKeys(): Record<string, Phaser.Input.Keyboard.Key> {
        return {
            debugToggle: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F3),
            godMode: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
            unlimitedResources: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F2),
            timeSkip: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F4),
            spawnEnemy: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F6),
            killAllEnemies: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F7),
            teleport: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F8),
            resetPlayer: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F9),
            toggleGrid: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F10),
            toggleCollision: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F11),
            fastForward: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F12),
        }
    }

    private setupDebugUI() {
        // Create debug panel background
        this.panelBg = this.scene.add.rectangle(10, 10, 300, 240, 0x000000, 0.8)
        this.panelBg.setOrigin(0, 0)
        this.panelBg.setDepth(1000)
        this.panelBg.setScrollFactor(0)
        this.panelBg.setVisible(false)

        // Create debug text display
        this.debugText = this.scene.add.text(20, 20, "", {
            fontSize: "14px",
            color: "#00ff00",
            backgroundColor: "#000000aa",
            padding: { x: 5, y: 5 },
            fontFamily: "monospace"
        })
        this.debugText.setDepth(1001)
        this.debugText.setScrollFactor(0)
        this.debugText.setVisible(false)

        // FPS counter
        this.fpsText = this.scene.add.text(this.scene.cameras.main.width - 150, 10, "", {
            fontSize: "14px",
            color: "#ffff00",
            backgroundColor: "#000000aa",
            padding: { x: 5, y: 5 },
            fontFamily: "monospace"
        })
        this.fpsText.setDepth(1001)
        this.fpsText.setScrollFactor(0)
        this.fpsText.setVisible(this.options.showFPS) // Show if showFPS is true

        // Grid graphics
        this.gridGraphics = this.scene.add.graphics()
        this.gridGraphics.setDepth(500)
        this.gridGraphics.setVisible(false)
    }

    private setupConsoleCommands() {
        // Add debug commands to console
        (window as any).debug = {
            giveItem: (itemId: string, quantity: number = 1) => {
                console.log(`Giving ${quantity}x ${itemId}`);
                this.scene.events.emit('debugGiveItem', { itemId, quantity });
            },
            setTime: (timeOfDay: number) => {
                console.log(`Setting time to ${timeOfDay}`);
                this.scene.events.emit('debugSetTime', timeOfDay);
            },
            spawnMonster: (type: string, x?: number, y?: number) => {
                console.log(`Spawning monster: ${type}`);
                this.scene.events.emit('debugSpawnMonster', { type, x, y });
            },
            completeAllQuests: () => {
                console.log("Completing all quests");
                this.scene.events.emit('debugCompleteAllQuests');
            },
            getPlayerState: () => {
                this.scene.events.emit('debugGetPlayerState');
            },
            teleportTo: (x: number, y: number) => {
                console.log(`Teleporting to (${x}, ${y})`);
                this.scene.events.emit('debugTeleportTo', { x, y });
            },
            toggleGodMode: () => this.toggleGodMode(),
            listItems: () => console.log(Object.keys(ITEMS)),
            showHelp: () => this.showConsoleHelp()
        };

        console.log("%cDebug System Active! Type 'debug.showHelp()' for commands", "color: #00ff00; font-size: 16px");
    }

    private showConsoleHelp() {
        console.log("%c=== Debug Commands ===", "color: #00ff00; font-size: 14px");
        console.log("debug.giveItem(itemId, quantity) - Give items to player");
        console.log("debug.setTime(timeOfDay) - Set time (0-1)");
        console.log("debug.spawnMonster(type, x, y) - Spawn monster");
        console.log("debug.completeAllQuests() - Complete all active quests");
        console.log("debug.getPlayerState() - Show player stats");
        console.log("debug.teleportTo(x, y) - Teleport player");
        console.log("debug.toggleGodMode() - Toggle god mode");
        console.log("debug.listItems() - List all available items");
        console.log("");
        console.log("%c=== Keyboard Shortcuts ===", "color: #ffff00");
        console.log("F3 - Toggle Debug UI");
        console.log("F1 - Toggle God Mode");
        console.log("F2 - Toggle Unlimited Resources");
        console.log("F4 - Skip Time (Hold)");
        console.log("F5 - Spawn Random Enemy");
        console.log("F6 - Give Debug Items");
        console.log("F7 - Kill All Enemies");
        console.log("F8 - Teleport to Mouse Position");
        console.log("F9 - Reset Player Position");
        console.log("F10 - Toggle Grid");
        console.log("F11 - Toggle Collision Boxes");
        console.log("F12 - Fast Forward Time (Hold)");
    }

    public update(player: Player, dayNightSystem?: any, monsterSystem?: any) {
        this.handleDebugInputs(player, dayNightSystem, monsterSystem);

        if (!this.isDebugVisible && !this.options.showFPS && !this.options.showCoordinates) {
            return;
        }

        this.updateDebugDisplay(player);

        if (this.options.showFPS) {
            this.updateFPSCounter();
        }

        if (this.options.showGrid) {
            this.drawGrid();
        }
    }

    private handleDebugInputs(player: Player, dayNightSystem?: any, monsterSystem?: any) {
        // Toggle debug visibility
        if (Phaser.Input.Keyboard.JustDown(this.keys.debugToggle)) {
            this.toggleDebug();
        }

        // Toggle god mode
        if (Phaser.Input.Keyboard.JustDown(this.keys.godMode)) {
            this.toggleGodMode();
            this.showNotification(`God Mode: ${this.options.godMode ? "ON" : "OFF"}`);
        }

        // Toggle unlimited resources
        if (Phaser.Input.Keyboard.JustDown(this.keys.unlimitedResources)) {
            this.toggleUnlimitedResources();
            this.showNotification(`Unlimited Resources: ${this.options.unlimitedResources ? "ON" : "OFF"}`);
        }

        // Skip time (instant)
        if (Phaser.Input.Keyboard.JustDown(this.keys.timeSkip) && dayNightSystem) {
            this.skipTime(dayNightSystem);
            this.showNotification("Time Skipped +4 hours");
        }

        // Spawn random enemy
        if (Phaser.Input.Keyboard.JustDown(this.keys.spawnEnemy) && monsterSystem) {
            this.spawnRandomEnemy(monsterSystem, player);
            this.showNotification("Spawned random enemy");
        }



        // Kill all enemies
        if (Phaser.Input.Keyboard.JustDown(this.keys.killAllEnemies) && monsterSystem) {
            this.killAllEnemies(monsterSystem);
            this.showNotification("All enemies eliminated");
        }

        // Teleport to mouse position
        if (Phaser.Input.Keyboard.JustDown(this.keys.teleport)) {
            this.teleportToMouse(player);
            this.showNotification("Teleported to mouse position");
        }

        // Reset player position
        if (Phaser.Input.Keyboard.JustDown(this.keys.resetPlayer)) {
            this.resetPlayerPosition(player);
            this.showNotification("Player position reset");
        }

        // Toggle grid
        if (Phaser.Input.Keyboard.JustDown(this.keys.toggleGrid)) {
            this.toggleGrid();
        }

        // Toggle collision boxes
        if (Phaser.Input.Keyboard.JustDown(this.keys.toggleCollision)) {
            this.toggleCollisionBoxes();
        }

        // Fast forward time (hold)
        if (this.keys.fastForward.isDown && dayNightSystem) {
            this.fastForwardTime(dayNightSystem);
        }

    }

    private updateDebugDisplay(player: Player) {
        let debugInfo = "";

        if (this.options.showCoordinates) {
            debugInfo += `Position: (${Math.floor(player.sprite.x)}, ${Math.floor(player.sprite.y)})\n`;
        }

        if (this.options.showQuestDebug) {
            debugInfo += `Quests Active: Check console for details\n`;
        }

        if (this.options.showSpawnPoints) {
            debugInfo += `Spawn Points: Visible on map\n`;
        }

        // Add status effects
        debugInfo += `\n=== Debug Status ===\n`;
        debugInfo += `God Mode: ${this.options.godMode ? "✓" : "✗"}\n`;
        debugInfo += `Unlimited Resources: ${this.options.unlimitedResources ? "✓" : "✗"}\n`;
        debugInfo += `Fast Movement: ${this.options.fastMovement ? "✓" : "✗"}\n`;
        debugInfo += `Day/Night Locked: ${this.options.disableDayNight ? "✓" : "✗"}\n`;



        this.debugText.setText(debugInfo);
    }

    private updateFPSCounter() {
        const fps = Math.floor(this.scene.game.loop.actualFps);
        const delta = this.scene.game.loop.delta.toFixed(2);
        let fpsColor = "#00ff00";
        if (fps < 30) fpsColor = "#ff0000";
        else if (fps < 50) fpsColor = "#ffff00";

        this.fpsText.setText(`FPS: ${fps}\nMS: ${delta}`);
        this.fpsText.setColor(fpsColor);
        this.fpsText.setPosition(this.scene.cameras.main.width - 150, 10);
    }

    private drawGrid() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x00ff00, 0.3);

        const gridSize = 50;
        const width = WORLD_SIZE;
        const height = WORLD_SIZE;

        for (let x = 0; x <= width; x += gridSize) {
            this.gridGraphics.moveTo(x, 0);
            this.gridGraphics.lineTo(x, height);
            this.gridGraphics.strokePath();
        }

        for (let y = 0; y <= height; y += gridSize) {
            this.gridGraphics.moveTo(0, y);
            this.gridGraphics.lineTo(width, y);
            this.gridGraphics.strokePath();
        }
    }

    private showNotification(message: string) {
        const notification = this.scene.add.text(
            this.scene.cameras.main.centerX,
            100,
            message,
            {
                fontSize: "18px",
                color: "#00ff00",
                backgroundColor: "#000000cc",
                padding: { x: 10, y: 5 },
                align: "center"
            }
        ).setOrigin(0.5).setDepth(2000).setScrollFactor(0);

        this.scene.time.delayedCall(2000, () => {
            notification.destroy();
        });
    }

    // Public methods to control debug features
    public toggleDebug() {
        this.isDebugVisible = !this.isDebugVisible;
        this.debugText.setVisible(this.isDebugVisible);
        this.options.showFPS = this.isDebugVisible;
        this.options.showCoordinates = this.isDebugVisible;
        this.fpsText.setVisible(this.options.showFPS);

        if (this.panelBg) this.panelBg.setVisible(this.isDebugVisible);

        this.showNotification(`Debug UI: ${this.isDebugVisible ? "ON" : "OFF"}`);
    }

    public toggleGodMode() {
        this.options.godMode = !this.options.godMode;
        this.scene.events.emit('debugGodMode', this.options.godMode);
    }

    public toggleUnlimitedResources() {
        this.options.unlimitedResources = !this.options.unlimitedResources;
        this.scene.events.emit('debugUnlimitedResources', this.options.unlimitedResources);
    }

    public toggleFastMovement() {
        this.options.fastMovement = !this.options.fastMovement;
        this.showNotification(`Fast Movement: ${this.options.fastMovement ? "ON" : "OFF"}`);
    }

    public toggleGrid() {
        this.options.showGrid = !this.options.showGrid;
        this.gridGraphics.setVisible(this.options.showGrid);
        this.showNotification(`Grid: ${this.options.showGrid ? "ON" : "OFF"}`);
    }

    public toggleCollisionBoxes() {
        this.options.showCollisionBoxes = !this.options.showCollisionBoxes;
        this.scene.events.emit('debugToggleCollisionBoxes', this.options.showCollisionBoxes);
        this.showNotification(`Collision Boxes: ${this.options.showCollisionBoxes ? "ON" : "OFF"}`);
    }

    public toggleDayNightLock() {
        this.options.disableDayNight = !this.options.disableDayNight;
        this.scene.events.emit('debugDisableDayNight', this.options.disableDayNight);
        this.showNotification(`Day/Night Cycle: ${this.options.disableDayNight ? "LOCKED" : "NORMAL"}`);
    }

    private skipTime(dayNightSystem: any) {
        for (let i = 0; i < 4; i++) {
            dayNightSystem.fastForward(0.04167); // Skip 1 hour each
        }
    }

    private fastForwardTime(dayNightSystem: any) {
        dayNightSystem.fastForward(0.01);
    }

    private spawnRandomEnemy(monsterSystem: any, player: Player) {
        const types = ["spider", "ghost", "brute"];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const spawnX = player.sprite.x + (Math.random() - 0.5) * 200;
        const spawnY = player.sprite.y + (Math.random() - 0.5) * 200;
        monsterSystem.spawnMonster(randomType, spawnX, spawnY);
    }


    private killAllEnemies(monsterSystem: any) {
        monsterSystem.getMonsterGroup().clear(true, true);
    }

    private teleportToMouse(player: Player) {
        const pointer = this.scene.input.activePointer;
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        player.sprite.setPosition(worldPoint.x, worldPoint.y);
    }

    private resetPlayerPosition(player: Player) {
        player.sprite.setPosition(750, 750);
    }

    // Getters for debug options
    public isGodMode(): boolean {
        return this.options.godMode;
    }

    public hasUnlimitedResources(): boolean {
        return this.options.unlimitedResources;
    }

    public isDayNightDisabled(): boolean {
        return this.options.disableDayNight;
    }

    public shouldShowCollisionBoxes(): boolean {
        return this.options.showCollisionBoxes;
    }

    // Cleanup method
    public destroy() {
        this.debugText?.destroy();
        this.fpsText?.destroy();
        this.gridGraphics?.destroy();
        (window as any).debug = undefined;
    }
}