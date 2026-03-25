"use client"

import { useEffect } from "react"

export default function GameCanvas() {

  useEffect(() => {

    const startGame = async () => {

      const Phaser = await import("phaser")
      const MainSceneModule = await import("../game/scenes/MainScene")
      const SecretLevelSceneModule = await import("../game/scenes/SecretLevelScene")
      const MainScene = MainSceneModule.default
      const SecretLevelScene = SecretLevelSceneModule.default

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        pixelArt: true,
        render: {
          antialias: false,
          roundPixels: true,
        },
      
        width: window.innerWidth,
        height: window.innerHeight,
        parent: "game-container",
        physics: {
          default: "arcade",
          arcade: { debug: false }
        },
        scene: [MainScene,SecretLevelScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        }
      }
      new Phaser.Game(config)
    }

    startGame()

  }, [])

  return <div id="game-container" />
}