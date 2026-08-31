import { createPoll } from "ags/time"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import Media from "./media"
import ControlCenter from "./controlcenter"

import { Lucide } from "./icons"

export interface WifiAccessPoint {
  ssid: string
  bssid: string
  inUse: boolean
  signal: number
  security: string
  isLocked: boolean
  isSaved: boolean
  icon: string
  signalBarText: string
}

function parseWifiList(raw: string, savedSet: Set<string>): WifiAccessPoint[] {
  const lines = raw.trim().split("\n").filter(Boolean)
  const map = new Map<string, WifiAccessPoint>()

  for (const line of lines) {
    // Format with nmcli -g IN-USE,SSID,SIGNAL,SECURITY,BSSID:
    // parts[0]: IN-USE (* or empty)
    // parts[1]: SSID
    // parts[2]: SIGNAL (0-100)
    // parts[3]: SECURITY (e.g. WPA2 or empty)
    // parts[4]: BSSID
    const parts = line.split(":")
    if (parts.length < 3) continue

    const inUse = parts[0].trim() === "*"
    const ssid = (parts[1] || "").trim()

    // Filter out empty SSIDs (hidden networks) and MAC addresses
    if (!ssid || ssid.includes("\\:") || /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(ssid)) {
      continue
    }

    const signal = parseInt(parts[2], 10) || 0
    const security = (parts[3] || "").trim()
    const bssid = (parts[4] || "").trim()

    const isLocked = security.length > 0 && security !== "--"
    const isSaved = savedSet.has(ssid)

    let icon = Lucide["wifi"]
    let signalBarText = "Excellent"
    if (signal >= 75) {
      icon = Lucide["wifi"]
      signalBarText = "Excellent"
    } else if (signal >= 50) {
      icon = Lucide["wifi-low"]
      signalBarText = "Good"
    } else if (signal >= 25) {
      icon = Lucide["wifi-low"]
      signalBarText = "Fair"
    } else {
      icon = Lucide["wifi-zero"]
      signalBarText = "Weak"
    }

    const existing = map.get(ssid)
    if (!existing || inUse || signal > existing.signal) {
      map.set(ssid, {
        ssid,
        bssid,
        inUse,
        signal,
        security,
        isLocked,
        isSaved,
        icon,
        signalBarText,
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
  private _isConnecting = createState<boolean>(false)
  private _statusMessage = createState<string>("")
  private _passwordTarget = createState<string>("")
  private _passwordInput = createState<string>("")
  private _networks = createState<WifiAccessPoint[]>([])
  private _savedSet = new Set<string>()

  public readonly isOpen = this._isOpen[0]
  public readonly isScanning = this._isScanning[0]
  public readonly isConnecting = this._isConnecting[0]
  public readonly statusMessage = this._statusMessage[0]
  public readonly passwordTarget = this._passwordTarget[0]
  public readonly passwordInput = this._passwordInput[0]
  public readonly networks = this._networks[0]

  // Poll active Wi-Fi SSID
  public readonly ssid = createPoll("RE4R", 3000, async () => {
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
    return this.isConnected() ? Lucide["wifi"] : Lucide["wifi-off"]
  })

  public readonly className = createComputed(() => {
    return `Network ${this.isConnected() ? "connected" : "disconnected"}`
  })

  constructor() {
    this.refreshSaved()
    this.rescan()
  }

  public async refreshSaved() {
    try {
      const out = await execAsync("nmcli -g NAME,TYPE connection show")
      const set = new Set<string>()
      for (const line of out.split("\n")) {
        const [name, type] = line.split(":")
        if (type && type.includes("wireless") && name) {
          set.add(name.trim())
        }
      }
      this._savedSet = set
    } catch {
      // ignore
    }
  }

  public toggleOpen() {
    const next = !this.isOpen()
    if (next) {
      Media.setOpen(false)
      ControlCenter.setOpen(false)
      this._passwordTarget[1]("")
      this._statusMessage[1]("")
      this.rescan()
    }
    this._isOpen[1](next)
  }

  public setOpen(open: boolean) {
    if (open) {
      Media.setOpen(false)
      ControlCenter.setOpen(false)
      this._passwordTarget[1]("")
      this._statusMessage[1]("")
      this.rescan()
    }
    this._isOpen[1](open)
  }

  public setPasswordInput(pwd: string) {
    this._passwordInput[1](pwd)
  }

  public cancelPassword() {
    this._passwordTarget[1]("")
    this._passwordInput[1]("")
    this._statusMessage[1]("")
  }

  public async rescan() {
    this._isScanning[1](true)
    try {
      await this.refreshSaved()
      const out = await execAsync("nmcli -g IN-USE,SSID,SIGNAL,SECURITY,BSSID dev wifi list")
      this._networks[1](parseWifiList(out, this._savedSet))

      execAsync("nmcli dev wifi rescan")
        .then(async () => {
          const fresh = await execAsync("nmcli -g IN-USE,SSID,SIGNAL,SECURITY,BSSID dev wifi list")
          this._networks[1](parseWifiList(fresh, this._savedSet))
        })
        .finally(() => {
          this._isScanning[1](false)
        })
    } catch {
      this._isScanning[1](false)
    }
  }

  public async handleNetworkClick(ap: WifiAccessPoint) {
    if (ap.inUse) {
      // Connected -> Disconnect
      await this.disconnect(ap)
      return
    }

    if (!ap.isLocked || ap.isSaved) {
      // Open network or previously saved network -> Connect directly
      await this.connectDirect(ap.ssid)
      return
    }

    // Secured network needing password -> Open password prompt
    this._passwordTarget[1](ap.ssid)
    this._passwordInput[1]("")
    this._statusMessage[1]("")
  }

  public async connectDirect(ssid: string) {
    this._isConnecting[1](true)
    this._statusMessage[1](`Connecting to ${ssid}...`)

    try {
      await execAsync(`nmcli dev wifi connect "${ssid}"`)
      this._statusMessage[1](`Connected to ${ssid}`)
      this._passwordTarget[1]("")
      await this.rescan()
    } catch (err: any) {
      // Direct connection failed (may require password)
      this._passwordTarget[1](ssid)
      this._statusMessage[1]("Authentication required")
    } finally {
      this._isConnecting[1](false)
    }
  }

  public async submitPassword() {
    const ssid = this.passwordTarget()
    const password = this.passwordInput()
    if (!ssid || !password) return

    this._isConnecting[1](true)
    this._statusMessage[1](`Connecting to ${ssid}...`)

    try {
      await execAsync(`nmcli dev wifi connect "${ssid}" password "${password}"`)
      this._statusMessage[1](`Connected to ${ssid}`)
      this._passwordTarget[1]("")
      this._passwordInput[1]("")
      await this.rescan()
    } catch (err: any) {
      this._statusMessage[1]("Failed to connect. Check password.")
    } finally {
      this._isConnecting[1](false)
    }
  }

  public async disconnect(ap: WifiAccessPoint) {
    this._statusMessage[1](`Disconnecting from ${ap.ssid}...`)
    try {
      await execAsync(`nmcli con down id "${ap.ssid}"`).catch(async () => {
        await execAsync("nmcli dev disconnect wlo1").catch(() => {})
      })
      this._statusMessage[1](`Disconnected`)
      await this.rescan()
    } catch {
      this._statusMessage[1](`Failed to disconnect`)
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
