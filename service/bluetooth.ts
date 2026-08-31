import { createPoll } from "ags/time"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

class BluetoothService {
  // Poll bluetooth status every 3 seconds
  public readonly isPowered = createPoll(false, 3000, async () => {
    try {
      const out = await execAsync("bluetoothctl show")
      return out.includes("Powered: yes")
    } catch {
      return false
    }
  })

  // Poll connected device name if any
  public readonly connectedDevice = createPoll("", 3000, async () => {
    try {
      const out = await execAsync("bluetoothctl devices Connected")
      const first = out.trim().split("\n")[0]
      if (first) {
        const parts = first.split(" ")
        if (parts.length >= 3) {
          return parts.slice(2).join(" ")
        }
      }
    } catch {
      // ignore
    }
    return ""
  })

  public readonly statusText = createComputed(() => {
    if (!this.isPowered()) return "Off"
    const dev = this.connectedDevice()
    if (dev) {
      return dev.length > 10 ? dev.slice(0, 8) + "…" : dev
    }
    return "On"
  })

  public readonly icon = createComputed(() => {
    return this.isPowered() ? "󰂯" : "󰂲"
  })

  public togglePower() {
    const nextState = !this.isPowered()
    execAsync(`bluetoothctl power ${nextState ? "on" : "off"}`).catch(() => {})
  }
}

export const Bluetooth = new BluetoothService()
export default Bluetooth
