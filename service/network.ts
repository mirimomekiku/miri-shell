import { createPoll } from "ags/time"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

class NetworkService {
  // Poll active Wi-Fi SSID
  public readonly ssid = createPoll("RE4R", 5000, async () => {
    try {
      const out = await execAsync("nmcli -t -f ACTIVE,SSID dev wifi")
      const activeLine = out.split("\n").find((line) => line.startsWith("yes:"))
      if (activeLine) {
        const name = activeLine.replace("yes:", "").trim()
        if (name) return name
      }
    } catch {
      // ignore
    }
    return "Disconnected"
  })

  public readonly isConnected = createComputed(() => {
    const s = this.ssid()
    return s !== "Disconnected" && s !== ""
  })

  public readonly displayText = createComputed(() => {
    return this.isConnected() ? this.ssid() : ""
  })

  public readonly icon = createComputed(() => {
    return this.isConnected() ? "󰤨" : "󰤮"
  })

  public readonly className = createComputed(() => {
    return `Network ${this.isConnected() ? "connected" : "disconnected"}`
  })
}

export const Network = new NetworkService()
export default Network
