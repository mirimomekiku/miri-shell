import { createState, createEffect, onMount } from "gnim"
import { execAsync, subprocess, Process } from "ags/process"
import GLib from "gi://GLib?version=2.0"

export interface HyprlandWorkspace {
  id: number
  name: string
  windows?: number
}

export interface HyprlandClient {
  address: string
  title: string
  class: string
  workspace: { id: number; name: string }
}

class HyprlandService {
  private _focusedWorkspace = createState<number>(1)
  private _focusedTitle = createState<string>("")
  private _focusedClass = createState<string>("")
  private _workspaces = createState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  private _occupiedWorkspaces = createState<number[]>([1])

  private eventProc: Process | null = null

  public readonly focusedWorkspace = this._focusedWorkspace[0]
  public readonly focusedTitle = this._focusedTitle[0]
  public readonly focusedClass = this._focusedClass[0]
  public readonly workspaces = this._workspaces[0]
  public readonly occupiedWorkspaces = this._occupiedWorkspaces[0]

  constructor() {
    this.init()
  }

  private async init() {
    await this.syncState()
    this.listenEvents()
  }

  public async syncState() {
    try {
      // Fetch active workspace
      const activeWsJson = await execAsync("hyprctl -j activeworkspace")
      if (activeWsJson) {
        const activeWs = JSON.parse(activeWsJson)
        if (typeof activeWs.id === "number") {
          this._focusedWorkspace[1](activeWs.id)
        }
      }
    } catch {
      // Hyprland may not be running or not ready yet
    }

    try {
      // Fetch active window
      const activeWinJson = await execAsync("hyprctl -j activewindow")
      if (activeWinJson) {
        const activeWin = JSON.parse(activeWinJson)
        this._focusedTitle[1](activeWin.title || "")
        this._focusedClass[1](activeWin.class || "")
      }
    } catch {
      // ignore
    }

    try {
      // Fetch list of occupied workspaces
      const wsListJson = await execAsync("hyprctl -j workspaces")
      if (wsListJson) {
        const wsList: Array<{ id: number; windows: number }> = JSON.parse(wsListJson)
        const occupied = wsList.filter((ws) => ws.id > 0 && (ws.windows ?? 1) > 0).map((ws) => ws.id)
        this._occupiedWorkspaces[1](occupied)
      }
    } catch {
      // ignore
    }
  }

  private listenEvents() {
    const his = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")
    const runtimeDir = GLib.getenv("XDG_RUNTIME_DIR") || `/run/user/${GLib.get_user_name()}`
    
    if (!his) {
      return
    }

    const socketPath = `${runtimeDir}/hypr/${his}/.socket2.sock`

    try {
      // Use socat to listen to unix domain socket stream
      this.eventProc = subprocess(
        ["socat", "-u", "UNIX-CONNECT:" + socketPath, "-"],
        (line: string) => {
          this.handleEvent(line.trim())
        },
        () => {
          // suppress stream errors
        }
      )
    } catch (e) {
      console.warn("Could not attach Hyprland socket listener:", e)
    }
  }

  private handleEvent(eventLine: string) {
    if (!eventLine) return

    const [event, data] = eventLine.split(">>")
    if (!event) return

    switch (event) {
      case "workspace":
      case "workspacev2": {
        const wsId = parseInt(data.split(",")[0], 10)
        if (!isNaN(wsId)) {
          this._focusedWorkspace[1](wsId)
        }
        break
      }
      case "focusedmon": {
        const parts = data.split(",")
        if (parts.length >= 2) {
          const wsId = parseInt(parts[1], 10)
          if (!isNaN(wsId)) {
            this._focusedWorkspace[1](wsId)
          }
        }
        break
      }
      case "activewindow": {
        const [cls, ...titleParts] = data.split(",")
        const title = titleParts.join(",")
        this._focusedClass[1](cls || "")
        this._focusedTitle[1](title || "")
        break
      }
      case "activewindowv2": {
        this.syncActiveWindow()
        break
      }
      case "createworkspace":
      case "createworkspacev2":
      case "destroyworkspace":
      case "destroyworkspacev2":
      case "openwindow":
      case "closewindow":
      case "movewindow": {
        this.syncWorkspaces()
        break
      }
    }
  }

  public async syncActiveWindow() {
    try {
      const activeWinJson = await execAsync("hyprctl -j activewindow")
      if (activeWinJson) {
        const activeWin = JSON.parse(activeWinJson)
        this._focusedTitle[1](activeWin.title || "")
        this._focusedClass[1](activeWin.class || "")
      }
    } catch {
      // ignore
    }
  }

  public async syncWorkspaces() {
    try {
      const wsListJson = await execAsync("hyprctl -j workspaces")
      if (wsListJson) {
        const wsList: Array<{ id: number; windows: number }> = JSON.parse(wsListJson)
        const occupied = wsList.filter((ws) => ws.id > 0 && (ws.windows ?? 1) > 0).map((ws) => ws.id)
        this._occupiedWorkspaces[1](occupied)
      }
    } catch {
      // ignore
    }
  }

  public dispatch(cmd: string) {
    execAsync(`hyprctl dispatch ${cmd}`).catch((err) => {
      console.error("Hyprland dispatch error:", err)
    })
  }

  public changeWorkspace(id: number) {
    this.dispatch(`workspace ${id}`)
  }
}

export const Hyprland = new HyprlandService()
export default Hyprland
