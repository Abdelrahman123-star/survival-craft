import { IUI } from "./IUI"

export class UIManager {
    private uis: Map<string, IUI> = new Map()

    registerUI(id: string, ui: IUI) {
        this.uis.set(id, ui)
        if (ui.setManager) {
            ui.setManager(this)
        }
    }

    getUI<T extends IUI = IUI>(id: string): T {
        const ui = this.uis.get(id)
        if (!ui) {
            throw new Error(`UI with id '${id}' not found in UIManager`)
        }
        return ui as T
    }

    closeAllExcept(idToKeepOpen?: string) {
        this.uis.forEach((ui, id) => {
            if (id !== idToKeepOpen && ui.isOpenNow()) {
                ui.hide?.() || ui.toggle?.(false)
            }
        })
    }

    closeAll() {
        this.closeAllExcept()
    }

    update() {
        this.uis.forEach((ui) => {
            ui.update?.()
        })
    }
}
