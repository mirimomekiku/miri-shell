import { createPoll } from "ags/time"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

class BatteryService {
  // Poll capacity every 2 seconds
  public readonly capacity = createPoll(100, 2000, async () => {
    try {
      const cap = await execAsync("cat /sys/class/power_supply/BAT0/capacity")
      return parseInt(cap.trim(), 10) || 100
    } catch {
      return 100
    }
  })

  // Poll status (Charging, Discharging, Full)
  public readonly status = createPoll("Discharging", 2000, async () => {
    try {
      const stat = await execAsync("cat /sys/class/power_supply/BAT0/status")
      return stat.trim()
    } catch {
      return "Full"
    }
  })

  public readonly isCharging = createComputed(() => {
    const s = this.status().toLowerCase().trim()
    return s === "charging"
  })

  public readonly percentageText = createComputed(() => {
    return `${this.capacity()}%`
  })

  public readonly icon = createComputed(() => {
    const cap = this.capacity()
    const charging = this.isCharging()

    if (charging) return "󰂄"
    if (cap >= 90) return "󰁹"
    if (cap >= 70) return "󰂀"
    if (cap >= 50) return "󰁾"
    if (cap >= 30) return "󰁼"
    if (cap >= 15) return "󰁺"
    return "󰂃"
  })
}

export const Battery = new BatteryService()
export default Battery
