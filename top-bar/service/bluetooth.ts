import { createPoll } from "ags/time"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"

import { Lucide } from "./icons"

export interface BluetoothDevice {
  mac: string
  name: string
  paired: boolean
  connected: boolean
  icon: string
}

class BluetoothService {
  private _isExpanded = createState<boolean>(false)
  private _isScanning = createState<boolean>(false)
  private _statusMessage = createState<string>("")
  private _devices = createState<BluetoothDevice[]>([])
  private _controllerName = createState<string>("mirimomekiku")

  public readonly isExpanded = this._isExpanded[0]
  public readonly isScanning = this._isScanning[0]
  public readonly statusMessage = this._statusMessage[0]
  public readonly devices = this._devices[0]
  public readonly controllerName = this._controllerName[0]

  public readonly visibleAsText = createComputed(() => {
    return `Visible as "${this.controllerName()}"`
  })

  // Poll bluetooth adapter power status every 3 seconds
  public readonly isPowered = createPoll(false, 3000, async () => {
    try {
      const out = await execAsync("bluetoothctl show")
      const nameMatch = out.match(/Name:\s+(.+)/)
      if (nameMatch && nameMatch[1]) {
        this._controllerName[1](nameMatch[1].trim())
      }
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
    return this.isPowered() ? Lucide["bluetooth"] : Lucide["bluetooth-off"]
  })

  constructor() {
    this.refreshDevices()
  }

  public toggleExpanded() {
    if (!this.isPowered()) {
      this.togglePower()
      this._isExpanded[1](true)
    } else {
      this._isExpanded[1](!this.isExpanded())
    }

    if (this.isExpanded()) {
      this.refreshDevices()
    }
  }

  public setExpanded(expanded: boolean) {
    this._isExpanded[1](expanded)
    if (expanded) {
      this.refreshDevices()
    }
  }

  public async togglePower() {
    const next = !this.isPowered()
    try {
      await execAsync(`bluetoothctl power ${next ? "on" : "off"}`)
      if (!next) {
        this._isExpanded[1](false)
      } else {
        this.refreshDevices()
      }
    } catch {
      // ignore
    }
  }

  public async refreshDevices() {
    try {
      const [allOut, pairedOut, connOut] = await Promise.all([
        execAsync("bluetoothctl devices").catch(() => ""),
        execAsync("bluetoothctl devices Paired").catch(() => ""),
        execAsync("bluetoothctl devices Connected").catch(() => ""),
      ])

      const pairedSet = new Set<string>()
      for (const line of pairedOut.split("\n")) {
        const parts = line.split(" ")
        if (parts.length >= 2 && parts[1]) pairedSet.add(parts[1].trim())
      }

      const connSet = new Set<string>()
      for (const line of connOut.split("\n")) {
        const parts = line.split(" ")
        if (parts.length >= 2 && parts[1]) connSet.add(parts[1].trim())
      }

      const map = new Map<string, BluetoothDevice>()
      for (const line of allOut.split("\n")) {
        const parts = line.trim().split(" ")
        if (parts.length >= 3) {
          const mac = parts[1]
          const name = parts.slice(2).join(" ")
          if (mac && name) {
            const isPaired = pairedSet.has(mac)
            const isConn = connSet.has(mac)
            map.set(mac, {
              mac,
              name,
              paired: isPaired,
              connected: isConn,
              icon: isConn ? Lucide["bluetooth-connected"] : isPaired ? Lucide["link-2"] : Lucide["bluetooth"],
            })
          }
        }
      }

      const list = Array.from(map.values()).sort((a, b) => {
        if (a.connected) return -1
        if (b.connected) return 1
        if (a.paired && !b.paired) return -1
        if (!a.paired && b.paired) return 1
        return a.name.localeCompare(b.name)
      })

      this._devices[1](list)
    } catch {
      // ignore
    }
  }

  public async rescan() {
    this._isScanning[1](true)
    this._statusMessage[1]("Scanning for Bluetooth devices...")

    try {
      execAsync("bluetoothctl --timeout 8 scan on")
        .then(() => this.refreshDevices())
        .finally(() => {
          this._isScanning[1](false)
          this._statusMessage[1]("")
        })
    } catch {
      this._isScanning[1](false)
      this._statusMessage[1]("")
    }
  }

  public async handleDeviceClick(dev: BluetoothDevice) {
    if (dev.connected) {
      await this.disconnect(dev)
    } else {
      await this.connect(dev)
    }
  }

  public async connect(dev: BluetoothDevice) {
    this._statusMessage[1](`Connecting to ${dev.name}...`)
    try {
      if (!dev.paired) {
        await execAsync(`bluetoothctl pair ${dev.mac}`).catch(() => {})
        await execAsync(`bluetoothctl trust ${dev.mac}`).catch(() => {})
      }
      await execAsync(`bluetoothctl connect ${dev.mac}`)
      this._statusMessage[1](`Connected to ${dev.name}`)
      await this.refreshDevices()
    } catch (e) {
      this._statusMessage[1](`Failed to connect to ${dev.name}`)
    }
  }

  public async disconnect(dev: BluetoothDevice) {
    this._statusMessage[1](`Disconnecting from ${dev.name}...`)
    try {
      await execAsync(`bluetoothctl disconnect ${dev.mac}`)
      this._statusMessage[1](`Disconnected`)
      await this.refreshDevices()
    } catch {
      this._statusMessage[1](`Failed to disconnect`)
    }
  }

  public async forget(dev: BluetoothDevice) {
    this._statusMessage[1](`Removing ${dev.name}...`)
    try {
      await execAsync(`bluetoothctl remove ${dev.mac}`)
      this._statusMessage[1](`Removed ${dev.name}`)
      await this.refreshDevices()
    } catch {
      this._statusMessage[1](`Failed to remove`)
    }
  }

  public openSettings() {
    execAsync("gnome-control-center bluetooth").catch(() => {
      execAsync("blueman-manager").catch(() => {})
    })
  }
}

export const Bluetooth = new BluetoothService()
export default Bluetooth
