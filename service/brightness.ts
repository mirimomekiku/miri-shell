import { createPoll } from "ags/time"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

class BrightnessService {
  // Poll brightness every 2 seconds
  public readonly brightness = createPoll(50, 2000, async () => {
    try {
      const out = await execAsync("brightnessctl -m info")
      // Output format: amdgpu_bl1,backlight,28093,46%,61680
      const parts = out.trim().split(",")
      if (parts.length >= 4) {
        const pctStr = parts[3].replace("%", "")
        return parseInt(pctStr, 10) || 50
      }
    } catch {
      // ignore
    }
    return 50
  })

  public readonly brightnessRatio = createComputed(() => {
    return Math.min(1, Math.max(0, this.brightness() / 100))
  })

  public readonly percentageText = createComputed(() => {
    return `${this.brightness()}%`
  })

  public readonly icon = createComputed(() => {
    const b = this.brightness()
    if (b >= 75) return "󰃠"
    if (b >= 40) return "󰃟"
    if (b >= 10) return "󰃞"
    return "󰃝"
  })

  public setBrightness(percent: number) {
    const clamped = Math.min(100, Math.max(1, percent))
    execAsync(`brightnessctl s ${clamped}%`).catch(() => {})
  }
}

export const Brightness = new BrightnessService()
export default Brightness
