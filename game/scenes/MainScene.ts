import * as Phaser from "phaser"

// ============================
// Constants
// ============================
const WORLD_SIZE = 1500
const PLAYER_SPEED = 200
const MONSTER_SPEED = 100
const MONSTER_SPAWN_DELAY = 33000
const TREE_COUNT = 50
const TREE_INTERACT_RADIUS = 80
const MERCHANT_INTERACT_RADIUS = 70
const WOOD_TO_COIN_RATE = 2

const ITEM_PRICES: Record<string, number> = {
  sword: 5,
  bow: 8,
  pickaxe: 4,
  axe: 3,
}

const SHOP_ITEMS = [
  { key: "sword",   label: "Sword",   desc: "Melee weapon" },
  { key: "bow",     label: "Bow",      desc: "Ranged weapon" },
  { key: "pickaxe", label: "Pickaxe", desc: "Mine resources" },
  { key: "axe",     label: "Axe",     desc: "Chop faster" },
]

const GROUND_TILES = ["ground", "ground", "ground", "ground", "grass", "grass", "flower-grass"]

// ============================
// Main Scene
// ============================
export default class MainScene extends Phaser.Scene {

  // --- Player ---
  private player!: Phaser.Physics.Arcade.Sprite
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private interactKey!: Phaser.Input.Keyboard.Key

  // --- Resources ---
  private wood = 0
  private coins = 0
  private inventory: Record<string, number> = { sword: 0, bow: 0, pickaxe: 0, axe: 0 }

  // --- World ---
  private trees!: Phaser.GameObjects.Group
  private monsters!: Phaser.Physics.Arcade.Group

  // --- Merchant ---
  private merchant!: Phaser.Physics.Arcade.Sprite
  private merchantUI!: Phaser.GameObjects.Container
  private merchantOpen = false

  // --- HUD ---
  private woodText!: Phaser.GameObjects.Text
  private coinsText!: Phaser.GameObjects.Text

  constructor() {
    super("MainScene")
  }

  // ============================
  // Lifecycle
  // ============================

  
  preload() {
    const assets: Record<string, string> = {
      player:         "/assets/player.png",
      ground:         "/assets/plain-grass.png",
      "flower-grass": "/assets/flower-grass.png",
      grass:          "/assets/grass.png",
      tree_bottom:    "/assets/tree_bottom.png",
      tree_top:       "/assets/tree_top.png",
      monster:        "/assets/spider.png",
      merchant:       "/assets/merchant.png",
      sword:          "/assets/wood-sword.png",
      axe:            "/assets/axe.png",
      pickaxe:        "/assets/pickaxe.png",
      bow:            "/assets/bow.png",
    }
    Object.entries(assets).forEach(([key, path]) => this.load.image(key, path))
  }

  create() {
    this.createWorld()
    this.createPlayer()
    this.createTrees()
    this.createMerchant()
    this.createMonsters()
    this.createHUD()
    this.setupCamera()
    this.setupControls()
  }

  update() {
    this.handleMovement()
    this.handleInteraction()
    this.updateMonsters()
  }

  // ============================
  // World Setup
  // ============================

  private createWorld() {
    const tileSize = 16 * 3
    for (let x = 0; x < WORLD_SIZE; x += tileSize) {
      for (let y = 0; y < WORLD_SIZE; y += tileSize) {
        const texture = Phaser.Utils.Array.GetRandom(GROUND_TILES)
        this.add.image(x, y, texture).setOrigin(0).setScale(3).setDepth(0)
      }
    }
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player").setScale(3).setDepth(1)
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player)
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE)
  }

  private setupControls() {
    this.keys = this.input.keyboard!.addKeys({
      up: "W", down: "S", left: "A", right: "D"
    }) as Record<string, Phaser.Input.Keyboard.Key>
    this.interactKey = this.input.keyboard!.addKey("E")
  }

  // ============================
  // Trees
  // ============================

  private createTrees() {
    this.trees = this.add.group()
    for (let i = 0; i < TREE_COUNT; i++) {
      this.trees.add(this.createTree(
        Math.random() * WORLD_SIZE,
        Math.random() * WORLD_SIZE
      ))
    }
  }

  private createTree(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y, [
      this.add.sprite(0,  16, "tree_bottom").setScale(3),
      this.add.sprite(0, -16, "tree_top").setScale(3).setDepth(2),
    ])
    container.setDepth(1)
    this.physics.add.existing(container)
    ;(container.body as Phaser.Physics.Arcade.Body).setImmovable(true)
    return container
  }

  private chopTree(tree: Phaser.GameObjects.Container) {
    tree.destroy()
    this.wood++
    this.woodText.setText("🪵 Wood: " + this.wood)
  }

  // ============================
  // Monsters
  // ============================

  private createMonsters() {
    this.monsters = this.physics.add.group()
    this.time.addEvent({
      delay: MONSTER_SPAWN_DELAY,
      callback: this.spawnMonster,
      callbackScope: this,
      loop: true,
    })
  }

  private spawnMonster() {
    this.monsters.create(Math.random() * WORLD_SIZE, Math.random() * WORLD_SIZE, "monster")
      .setScale(3).setDepth(1).setCollideWorldBounds(true)
  }

  private updateMonsters() {
    this.monsters.getChildren().forEach((go) => {
      const m = go as Phaser.Physics.Arcade.Sprite
      const angle = Math.atan2(this.player.y - m.y, this.player.x - m.x)
      m.setVelocity(Math.cos(angle) * MONSTER_SPEED, Math.sin(angle) * MONSTER_SPEED)
    })
  }

  // ============================
  // Merchant
  // ============================

  private createMerchant() {
    this.merchant = this.physics.add.sprite(550, 300, "merchant")
      .setScale(3).setDepth(1).setImmovable(true)

    // Floating [E] Trade label
    this.add.text(550, 252, "[E] Trade", {
      fontSize: "13px",
      color: "#FFD700",
      fontFamily: "Arial",
      backgroundColor: "#000000bb",
      padding: { x: 7, y: 3 },
    }).setOrigin(0.5).setDepth(2)

    this.merchantUI = this.buildMerchantUI()
    this.merchantUI.setVisible(false)
  }

  private openMerchant() {
    this.merchantOpen = true
    this.merchantUI.setVisible(true)
    this.setMerchantStatus("")
    this.refreshMerchantItemButtons()
  }

  private closeMerchant() {
    this.merchantOpen = false
    this.merchantUI.setVisible(false)
  }

  private sellWood(amount: number) {
    const actualAmount = amount === -1 ? this.wood : amount
    if (actualAmount <= 0) { this.setMerchantStatus("❌  No wood to sell!"); return }
    this.wood -= actualAmount
    this.coins += actualAmount * WOOD_TO_COIN_RATE
    this.refreshHUD()
    this.refreshMerchantItemButtons()
    this.setMerchantStatus(`✅  Sold ${actualAmount} wood  →  +${actualAmount * WOOD_TO_COIN_RATE} coins`)
  }

  private buyItem(key: string) {
    const price = ITEM_PRICES[key]
    if (this.coins < price) { this.setMerchantStatus(`❌  Need ${price} coins!`); return }
    this.coins -= price
    this.inventory[key]++
    this.refreshHUD()
    this.refreshMerchantItemButtons()
    this.setMerchantStatus(`✅  Purchased ${key}!  (owned: ${this.inventory[key]})`)
  }

  private setMerchantStatus(msg: string) {
    const el = this.merchantUI.getByName("statusMsg") as Phaser.GameObjects.Text
    el?.setText(msg)
  }

  // Dim buy buttons when player can't afford them
  private refreshMerchantItemButtons() {
    SHOP_ITEMS.forEach(({ key }) => {
      const btn = this.merchantUI.getByName(`itemCard_${key}`) as Phaser.GameObjects.Rectangle | null
      const label = this.merchantUI.getByName(`itemPrice_${key}`) as Phaser.GameObjects.Text | null
      if (!btn || !label) return
      const canAfford = this.coins >= ITEM_PRICES[key]
      btn.setFillStyle(canAfford ? 0x2a1a4a : 0x1a1a1a)
      label.setColor(canAfford ? "#FFD700" : "#666666")
    })
  }

  // ============================
  // HUD
  // ============================

  private createHUD() {
    this.woodText = this.add
      .text(20, 20, "🪵  Wood: 0", {
        fontSize: "20px", color: "#e8dcc8", fontFamily: "Georgia",
        backgroundColor: "#00000099", padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0).setDepth(10)

    this.coinsText = this.add
      .text(20, 56, "🪙  Coins: 0", {
        fontSize: "20px", color: "#FFD700", fontFamily: "Georgia",
        backgroundColor: "#00000099", padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0).setDepth(10)
  }

  private refreshHUD() {
    this.woodText.setText("🪵  Wood: "  + this.wood)
    this.coinsText.setText("🪙  Coins: " + this.coins)
  }

  // ============================
  // Input
  // ============================

  private handleMovement() {
    if (this.merchantOpen) { this.player.setVelocity(0); return }
    this.player.setVelocity(0)
    if (this.keys.left.isDown)  this.player.setVelocityX(-PLAYER_SPEED)
    if (this.keys.right.isDown) this.player.setVelocityX(PLAYER_SPEED)
    if (this.keys.up.isDown)    this.player.setVelocityY(-PLAYER_SPEED)
    if (this.keys.down.isDown)  this.player.setVelocityY(PLAYER_SPEED)
  }

  private handleInteraction() {
    if (!Phaser.Input.Keyboard.JustDown(this.interactKey)) return
    if (this.distanceTo(this.merchant) < MERCHANT_INTERACT_RADIUS) {
      this.merchantOpen ? this.closeMerchant() : this.openMerchant()
      return
    }
    if (this.merchantOpen) return
    const tree = this.getNearbyTree()
    if (tree) this.chopTree(tree)
  }

  // ============================
  // Utilities
  // ============================

  private distanceTo(target: { x: number; y: number }): number {
    const dx = this.player.x - target.x
    const dy = this.player.y - target.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getNearbyTree(): Phaser.GameObjects.Container | undefined {
    return this.trees.getChildren().find((go) =>
      this.distanceTo(go as Phaser.GameObjects.Container) < TREE_INTERACT_RADIUS
    ) as Phaser.GameObjects.Container | undefined
  }

  // ============================
  // Merchant UI
  // ============================

  private buildMerchantUI(): Phaser.GameObjects.Container {
    const PW = 520, PH = 500
    const ui = this.add.container(this.scale.width / 2, this.scale.height / 2)
    ui.setScrollFactor(0).setDepth(50)

    // --- Outer shadow/glow layer ---
    const shadow = this.add.rectangle(4, 6, PW, PH, 0x000000, 0.6)
    const bg     = this.add.rectangle(0, 0, PW, PH, 0x0d0d1a)
    bg.setStrokeStyle(2, 0x8b6914)

    // Inner border accent
    const innerBorder = this.add.rectangle(0, 0, PW - 8, PH - 8, 0x0d0d1a, 0)
    innerBorder.setStrokeStyle(1, 0x3a2a0a)

    // Corner ornaments (small gold diamonds)
    const corners = [
      [-PW/2 + 14, -PH/2 + 14],
      [ PW/2 - 14, -PH/2 + 14],
      [-PW/2 + 14,  PH/2 - 14],
      [ PW/2 - 14,  PH/2 - 14],
    ].map(([cx, cy]) => {
      const d = this.add.rectangle(cx, cy, 8, 8, 0x8b6914).setAngle(45)
      return d
    })

    // --- Header ---
    const headerBg = this.add.rectangle(0, -PH/2 + 30, PW, 60, 0x1a0d00)
    headerBg.setStrokeStyle(1, 0x8b6914)

    const merchantIcon = this.add.text(-PW/2 + 24, -PH/2 + 18, "🏪", { fontSize: "28px" })

    const titleText = this.add.text(0, -PH/2 + 20, "MERCHANT", {
      fontSize: "24px", color: "#FFD700", fontFamily: "Georgia", fontStyle: "bold",
    }).setOrigin(0.5, 0)

    const subtitleText = this.add.text(0, -PH/2 + 46, "Trade goods & buy equipment", {
      fontSize: "12px", color: "#a08040", fontFamily: "Georgia", fontStyle: "italic",
    }).setOrigin(0.5, 0)

    // --- Divider after header ---
    const div1 = this.makeGoldDivider(0, -PH/2 + 68, PW - 20)

    // ── SELL section ──────────────────────────────────
    const sellLabel = this.add.text(-PW/2 + 18, -PH/2 + 80, "SELL WOOD", {
      fontSize: "11px", color: "#a08040", fontFamily: "Georgia", fontStyle: "bold",
    })

    const rateNote = this.add.text(PW/2 - 18, -PH/2 + 80, "1 wood = 2 coins", {
      fontSize: "11px", color: "#666644", fontFamily: "Georgia",
    }).setOrigin(1, 0)

    // Sell row background
    const sellRowBg = this.add.rectangle(0, -PH/2 + 112, PW - 20, 46, 0x140d00)
    sellRowBg.setStrokeStyle(1, 0x3a2a0a)

    // Wood icon + count display
    const woodDisplay = this.add.text(-PW/2 + 30, -PH/2 + 100, "🪵", { fontSize: "22px" })

    const woodCountDisplay = this.add.text(-PW/2 + 60, -PH/2 + 101, `${this.wood} wood`, {
      fontSize: "15px", color: "#c8b87a", fontFamily: "Georgia",
    }).setName("woodCountDisplay")

    // Sell 1 button
    const sell1Btn = this.makeIconButton(PW/2 - 180, -PH/2 + 112, "Sell 1", 90, 32, () => this.sellWood(1))

    // Sell All button
    const sellAllBtn = this.makeIconButton(PW/2 - 70, -PH/2 + 112, "Sell All", 110, 32, () => this.sellWood(-1), 0x5a2a00)

    // ── Divider ──────────────────────────────────────
    const div2 = this.makeGoldDivider(0, -PH/2 + 142, PW - 20)

    // ── BUY section ──────────────────────────────────
    const buyLabel = this.add.text(-PW/2 + 18, -PH/2 + 152, "BUY EQUIPMENT", {
      fontSize: "11px", color: "#a08040", fontFamily: "Georgia", fontStyle: "bold",
    })

    // Item cards (2 columns x 2 rows)
    const itemCards: Phaser.GameObjects.GameObject[] = []

    SHOP_ITEMS.forEach((item, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cardX = (col === 0 ? -PW/2 + 130 : PW/2 - 130)
      const cardY = -PH/2 + 200 + row * 100
      const cards = this.makeItemCard(cardX, cardY, item.key, item.label, item.desc)
      itemCards.push(...cards)
    })

    // ── Divider ──────────────────────────────────────
    const div3 = this.makeGoldDivider(0, PH/2 - 68, PW - 20)

    // ── Footer ───────────────────────────────────────
    const statusMsg = this.add.text(0, PH/2 - 50, "", {
      fontSize: "13px", color: "#FFD700", fontFamily: "Georgia",
    }).setOrigin(0.5).setName("statusMsg")

    const closeBtn = this.makeIconButton(0, PH/2 - 22, "✕  Close", 120, 30, () => this.closeMerchant(), 0x3a0000)

    ui.add([
      shadow, bg, innerBorder, ...corners,
      headerBg, merchantIcon, titleText, subtitleText,
      div1,
      sellLabel, rateNote, sellRowBg, woodDisplay, woodCountDisplay,
      sell1Btn, sellAllBtn,
      div2,
      buyLabel, ...itemCards,
      div3,
      statusMsg, closeBtn,
    ])

    return ui
  }

  // Builds one item card with background, image, label, price, buy button
private makeItemCard(
  x: number, y: number,
  key: string, label: string, desc: string
): Phaser.GameObjects.GameObject[] {
  const W = 220, H = 84
  const price = ITEM_PRICES[key]

  // --- Card background (draw first so it's behind everything) ---
  const card = this.add.rectangle(x, y, W, H, 0x2a1a4a)
  card.setStrokeStyle(2, 0x5a3a8a).setName(`itemCard_${key}`)

  // --- Item image ---
  const itemImg = this.add.image(x - W/2 + 40, y, key).setScale(2.4).setName(`itemImg_${key}`)
  
  // --- Item name (slightly bigger) ---
  const nameText = this.add.text(x - W/2 + 70, y - 24, label, {
    fontSize: "17px", color: "#e8dcc8", fontFamily: "Georgia", fontStyle: "bold",
  })

  // --- Item description (slightly bigger) ---
  const descText = this.add.text(x - W/2 + 70, y - 4, desc, {
    fontSize: "13px", color: "#ccc6a5", fontFamily: "Georgia", fontStyle: "italic",
  })

  // --- Price tag (slightly bigger) ---
  const priceText = this.add.text(x - W/2 + 70, y + 18, `💰 ${price} coins`, {
    fontSize: "14px", color: "#FFD700", fontFamily: "Georgia",
  }).setName(`itemPrice_${key}`)

  // --- Buy button ---
  const buyBtn = this.makeIconButton(x + W/2 - 36, y, "Buy", 60, 30, () => this.buyItem(key))

  return [card, itemImg, nameText, descText, priceText, buyBtn]
}
  // Reusable styled button
  private makeIconButton(
    x: number, y: number,
    label: string,
    width: number, height: number,
    onClick: () => void,
    bgColor = 0x2a1a5a
  ): Phaser.GameObjects.Text {
    const btn = this.add.text(x, y, label, {
      fontSize: "13px", color: "#e8dcc8", fontFamily: "Georgia",
      backgroundColor: "#" + bgColor.toString(16).padStart(6, "0"),
      padding: { x: 10, y: 6 },
      fixedWidth: width, fixedHeight: height, align: "center",
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })

    btn.on("pointerover",  () => { btn.setStyle({ color: "#FFD700" }); btn.setAlpha(0.9) })
    btn.on("pointerout",   () => { btn.setStyle({ color: "#e8dcc8" }); btn.setAlpha(1) })
    btn.on("pointerdown",  onClick)
    return btn
  }

  // Gold horizontal divider line
  private makeGoldDivider(x: number, y: number, width: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics()
    g.lineStyle(1, 0x8b6914, 0.6)
    g.lineBetween(x - width/2, y, x + width/2, y)
    // Small diamond in center
    g.fillStyle(0x8b6914, 0.8)
    g.fillRect(x - 4, y - 4, 8, 8)
    g.setAngle(45)
    return g
  }
}