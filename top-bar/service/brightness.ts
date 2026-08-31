import { createPoll } from "ags/time"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"

import { Lucide } from "./icons"

class BrightnessService {
  private _brightness = createState<number>(50)
  private _debounceTimer: any = null

  public readonly brightness = this._brightness[0]

  public readonly brightnessRatio = createComputed(() => {
    return Math.min(1, Math.max(0, this.brightness() / 100))
  })

  public readonly percentageText = createComputed(() => {
    return `${this.brightness()}%`
  })

  public readonly icon = createComputed(() => {
    const b = this.brightness()
    if (b >= 75) return Lucide["sun"]
    if (b >= 40) return Lucide["sun-medium"]
    if (b >= 10) return Lucide["sun-dim"]
    return Lucide["moon"]
  })

  // Poll in background to keep in sync with keyboard brightness keys
  public readonly poller = createPoll(null, 1500, async () => {
    try {
      const out = await execAsync("brightnessctl -m info")
      const parts = out.trim().split(",")
      if (parts.length >= 4) {
        const pctStr = parts[3].replace("%", "")
        const b = parseInt(pctStr, 10) || 50
        if (this._brightness[0]() !== b) {
          this._brightness[1](b)
        }
      }
    } catch {
      // ignore
    }
    return null
  })

  public setBrightness(percent: number) {
    const clamped = Math.min(100, Math.max(1, Math.round(percent)))
    // Instant real-time UI state update (0ms delay)
    this._brightness[1](clamped)

    // Apply to backlight hardware
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => {
      execAsync(`brightnessctl s ${clamped}%`).catch(() => {})
    }, 10)
  }
}

export const Brightness = new BrightnessService()
export default Brightness
