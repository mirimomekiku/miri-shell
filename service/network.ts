import { createPoll } from "ags/time"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import Media from "./media"
import ControlCenter from "./controlcenter"

export interface WifiAccessPoint {
  ssid: string
  bssid: string
  inUse: boolean
  signal: number
  security: string
  isLocked: boolean
  icon: string
}

function parseWifiList(raw: string): WifiAccessPoint[] {
  const lines = raw.trim().split("\n").filter(Boolean)
  const map = new Map<string, WifiAccessPoint>()

  for (const line of lines) {
    // Format: IN-USE:BSSID:SSID:SIGNAL:SECURITY
    // Note: BSSIDs may contain colons, nmcli escapes them like 36\:85\:...
    const parts = line.split(":")
    if (parts.length < 5) continue

    const inUse = parts[0].trim() === "*"
    const signal = parseInt(parts[parts.length - 2], 10) || 0
    const security = parts[parts.length - 1].trim()
    const ssid = parts.slice(2, parts.length - 2).join(":").replace(/\\:/g, ":").trim()

    if (!ssid) continue

    const isLocked = security.length > 0 && security !== "--"
    let icon = "󰤨"
    if (signal >= 75) icon = "󰤨"
    else if (signal >= 50) icon = "󰤥"
    else if (signal >= 25) icon = "󰤢"
    else icon = "󰤟"

    const existing = map.get(ssid)
    if (!existing || inUse || signal > existing.signal) {
      map.set(ssid, {
        ssid,
        bssid: parts[1] || "",
        inUse,
        signal,
        security,
        isLocked,
        icon,
      })
    }
  }

  const list = Array.from(map.values())
  return list.sort((a, b) => {
    if (a.inUse) return -1
    if (b.inUse) return 1
    return b.signal - a.signal
  })
}

class NetworkService {
  private _isOpen = createState<boolean>(false)
  private _isScanning = createState<boolean>(false)
  private _networks = createState<WifiAccessPoint[]>([])

  public readonly isOpen = this._isOpen[0]
  public readonly isScanning = this._isScanning[0]
  public readonly networks = this._networks[0]

  // Poll active Wi-Fi SSID
  public readonly ssid = createPoll("RE4R", 4000, async () => {
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

  constructor() {
    this.rescan()
  }

  public toggleOpen() {
    const next = !this.isOpen()
    if (next) {
      Media.setOpen(false)
      ControlCenter.setOpen(false)
      this.rescan()
    }
    this._isOpen[1](next)
  }

  public setOpen(open: boolean) {
    if (open) {
      Media.setOpen(false)
      ControlCenter.setOpen(false)
      this.rescan()
    }
    this._isOpen[1](open)
  }

  public async rescan() {
    this._isScanning[1](true)
    try {
      // Quick fetch of current known list
      const out = await execAsync("nmcli -t -f IN-USE,BSSID,SSID,SIGNAL,SECURITY dev wifi list")
      this._networks[1](parseWifiList(out))

      // Trigger background hardware rescan
      execAsync("nmcli dev wifi rescan")
        .then(async () => {
          const fresh = await execAsync("nmcli -t -f IN-USE,BSSID,SSID,SIGNAL,SECURITY dev wifi list")
          this._networks[1](parseWifiList(fresh))
        })
        .finally(() => {
          this._isScanning[1](false)
        })
    } catch {
      this._isScanning[1](false)
    }
  }

  public async connect(ap: WifiAccessPoint) {
    if (ap.inUse) return

    try {
      if (!ap.isLocked) {
        await execAsync(`nmcli dev wifi connect "${ap.ssid}"`)
      } else {
        // Try connecting using saved secrets or open connection editor
        await execAsync(`nmcli dev wifi connect "${ap.ssid}"`)
      }
      this.rescan()
    } catch {
      // If password required, open nm-connection-editor
      execAsync("nm-connection-editor").catch(() => {})
    }
  }

  public openSettings() {
    execAsync("nm-connection-editor").catch(() => {
      execAsync("gnome-control-center wifi").catch(() => {})
    })
  }
}

export const Network = new NetworkService()
export default Network
