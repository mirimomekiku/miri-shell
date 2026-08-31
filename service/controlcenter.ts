import { createState, createComputed } from "gnim"

class ControlCenterService {
  private _isOpen = createState<boolean>(false)
  private _dnd = createState<boolean>(false)
  private _timerMinutes = createState<number>(1)

  public readonly isOpen = this._isOpen[0]
  public readonly dnd = this._dnd[0]
  public readonly timerMinutes = this._timerMinutes[0]

  public toggleOpen() {
    this._isOpen[1](!this.isOpen())
  }

  public setOpen(open: boolean) {
    this._isOpen[1](open)
  }

  public toggleDnd() {
    this._dnd[1](!this.dnd())
  }

  public cycleTimer() {
    const current = this.timerMinutes()
    const options = [1, 5, 10, 15, 30]
    const idx = options.indexOf(current)
    const next = options[(idx + 1) % options.length]
    this._timerMinutes[1](next)
  }

  public readonly timerText = createComputed(() => {
    return `${this.timerMinutes()}m`
  })
}

export const ControlCenter = new ControlCenterService()
export default ControlCenter
