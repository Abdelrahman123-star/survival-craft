import * as Phaser from "phaser"
import { UIManager } from "./UIManager"

export interface IUI {
    isOpenNow(): boolean
    toggle?(force?: boolean): void
    show?(...args: any[]): void
    hide?(): void
    update?(): void
    setManager?(manager: UIManager): void
}
