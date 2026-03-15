import * as Phaser from "phaser"

export default class MainScene extends Phaser.Scene {

  // --- Properties ---
  player!: Phaser.Physics.Arcade.Sprite
  keys!: any
  trees!: Phaser.GameObjects.Group
  wood = 0
  woodText!: Phaser.GameObjects.Text
  interactKey!: Phaser.Input.Keyboard.Key

  monsters!: Phaser.Physics.Arcade.Group
  spawnTimer!: Phaser.Time.TimerEvent
  monsterSpeed = 100

  // --- Constructor ---
  constructor() {
    super("MainScene")
  }

  // --- Preload assets ---
  preload() {
    this.load.image("player", "/assets/player.png")
    this.load.image("ground", "/assets/ground.png")
    this.load.image("tree_bottom", "/assets/tree_bottom.png")
    this.load.image("tree_top", "/assets/tree_top.png")
    this.load.image("monster", "/assets/spider.png") // new monster asset
  }

  // --- Create game objects ---
  create() {
    this.setupControls()
    this.createWorld()
    this.createPlayer()
    this.createTrees()
    this.createUI()
    this.setupCamera()
    this.createMonsters()
  }

  // --- Update loop ---
  update() {
    this.handlePlayerMovement()
    this.handleTreeInteraction()
    this.handleMonsters()
  }

  // ============================
  // --- Helper Methods -------
  // ============================

  private setupControls() {
    this.keys = this.input.keyboard!.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D"
    })
    this.interactKey = this.input.keyboard!.addKey("E")
  }

  private createWorld() {
    this.add.tileSprite(0, 0, 500, 500, "ground")
      .setOrigin(0)
      .setScale(3)
      .setDepth(0)
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player")
    this.player.setScale(3)
    this.player.setDepth(1)
  }

  private createCamera() {
    this.cameras.main.startFollow(this.player)
    this.physics.world.setBounds(0, 0, 1500 * 3, 1500 * 3)
    this.cameras.main.setBounds(0, 0, 1500 * 3, 1500 * 3)
  }

  private createTrees() {
    this.trees = this.add.group()

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1500
      const y = Math.random() * 1500
      const tree = this.createTreeContainer(x, y)
      this.trees.add(tree)
    }
  }

  private createTreeContainer(x: number, y: number): Phaser.GameObjects.Container {
    const treeContainer = this.add.container(x, y)
    const bottom = this.add.sprite(0, 16, "tree_bottom").setScale(3)
    const top = this.add.sprite(0, -16, "tree_top").setScale(3).setDepth(2)
    treeContainer.add([bottom, top])
    treeContainer.setDepth(1)

    this.physics.add.existing(treeContainer)
    ;(treeContainer.body as Phaser.Physics.Arcade.Body).setImmovable(true)

    return treeContainer
  }

  private createUI() {
    this.woodText = this.add.text(20, 20, "Wood: 0", {
      fontSize: "24px",
      color: "#ffffff",
      fontFamily: "Arial"
    })
      .setScrollFactor(0)
      .setDepth(1)
  }

  private setupCamera() {
    this.cameras.main.startFollow(this.player)
  }

  // ============================
  // --- Player Mechanics ------
  // ============================

  private handlePlayerMovement() {
    const speed = 200
    this.player.setVelocity(0)

    if (this.keys.left.isDown) this.player.setVelocityX(-speed)
    if (this.keys.right.isDown) this.player.setVelocityX(speed)
    if (this.keys.up.isDown) this.player.setVelocityY(-speed)
    if (this.keys.down.isDown) this.player.setVelocityY(speed)
  }

  private handleTreeInteraction() {
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const nearbyTree = this.trees.getChildren().find(treeContainer => {
        const tc = treeContainer as Phaser.GameObjects.Container
        const dx = this.player.x - tc.x
        const dy = this.player.y - tc.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance < 50
      }) as Phaser.GameObjects.Container | undefined

      if (nearbyTree) {
        nearbyTree.destroy()
        this.wood += 1
        this.woodText.setText("Wood: " + this.wood)
      }
    }
  }

  // ============================
  // --- Monsters Mechanics ----
  // ============================

  private createMonsters() {
    this.monsters = this.physics.add.group()

    this.spawnTimer = this.time.addEvent({
      delay: 3000, // every 3 seconds
      callback: this.spawnMonster,
      callbackScope: this,
      loop: true
    })
  }

  private spawnMonster() {
    const x = Math.random() * 1500
    const y = Math.random() * 1500

    const monster = this.monsters.create(x, y, "monster") as Phaser.Physics.Arcade.Sprite
    monster.setScale(3)
    monster.setDepth(1)
    monster.setCollideWorldBounds(true)
  }

  private handleMonsters() {
    this.monsters.getChildren().forEach(monster => {
      const m = monster as Phaser.Physics.Arcade.Sprite
      const dx = this.player.x - m.x
      const dy = this.player.y - m.y
      const angle = Math.atan2(dy, dx)
      m.setVelocity(Math.cos(angle) * this.monsterSpeed, Math.sin(angle) * this.monsterSpeed)
    })
  }

}