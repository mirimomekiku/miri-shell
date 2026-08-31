import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"
import { subprocess, execAsync } from "ags/process"

export interface NotificationItem {
  id: number
  appName: string
  appIcon: string
  summary: string
  body: string
  time: string
}

function getAppIcon(name: string, fallback: string): string {
  const n = (name || "").toLowerCase()
  if (fallback && fallback.trim().length > 0 && !fallback.startsWith("/")) {
    return fallback.trim()
  }
  if (n.includes("hyprshot") || n.includes("screenshot") || n.includes("grim") || n.includes("flameshot")) {
    return "image-x-generic"
  }
  if (n.includes("spotify") || n.includes("music") || n.includes("audio")) {
    return "multimedia-audio-player"
  }
  if (n.includes("git") || n.includes("github") || n.includes("gitlab")) {
    return "vcs-normal"
  }
  if (n.includes("vpn") || n.includes("security") || n.includes("firewall")) {
    return "security-high"
  }
  if (n.includes("browser") || n.includes("firefox") || n.includes("chrome") || n.includes("brave")) {
    return "web-browser"
  }
  if (n.includes("discord") || n.includes("telegram") || n.includes("slack")) {
    return "chat-message-new"
  }
  return "dialog-information"
}

class NotificationService {
  private _notifications = createState<NotificationItem[]>([])
  private _nextId = 1
  private _lastSeenKey = ""

  public readonly notifications = this._notifications[0]

  public readonly count = createComputed(() => {
    return this.notifications().length
  })

  public readonly headerText = createComputed(() => {
    return `Notifications (${this.count()})`
  })

  constructor() {
    this.initLiveListener()
  }

  private addNotification(appName: string, appIcon: string, summary: string, body: string) {
    if (!summary && !body) return

    // Debounce exact duplicates within 1 second
    const key = `${appName}::${summary}::${body}`
    if (this._lastSeenKey === key) return
    this._lastSeenKey = key
    setTimeout(() => {
      if (this._lastSeenKey === key) this._lastSeenKey = ""
    }, 1000)

    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

    const item: NotificationItem = {
      id: this._nextId++,
      appName: appName || "System",
      appIcon: getAppIcon(appName, appIcon),
      summary: summary || appName || "Notification",
      body: body || "",
      time,
    }

    // Prepend new notification to live list
    this._notifications[1]([item, ...this.notifications()])
  }

  private initLiveListener() {
    // 1. Try to register native FreeDesktop DBus server
    try {
      const ifaceXml = `
      <node>
        <interface name="org.freedesktop.Notifications">
          <method name="Notify">
            <arg name="app_name" type="s" direction="in"/>
            <arg name="replaces_id" type="u" direction="in"/>
            <arg name="app_icon" type="s" direction="in"/>
            <arg name="summary" type="s" direction="in"/>
            <arg name="body" type="s" direction="in"/>
            <arg name="actions" type="as" direction="in"/>
            <arg name="hints" type="a{sv}" direction="in"/>
            <arg name="expire_timeout" type="i" direction="in"/>
            <arg name="id" type="u" direction="out"/>
          </method>
          <method name="CloseNotification"><arg name="id" type="u" direction="in"/></method>
          <method name="GetCapabilities"><arg name="capabilities" type="as" direction="out"/></method>
          <method name="GetServerInformation">
            <arg name="name" type="s" direction="out"/>
            <arg name="vendor" type="s" direction="out"/>
            <arg name="version" type="s" direction="out"/>
            <arg name="spec_version" type="s" direction="out"/>
          </method>
        </interface>
      </node>`

      const nodeInfo = Gio.DBusNodeInfo.new_for_xml(ifaceXml)
      const ifaceInfo = nodeInfo.interfaces[0]

      Gio.bus_own_name(
        Gio.BusType.SESSION,
        "org.freedesktop.Notifications",
        Gio.BusNameOwnerFlags.REPLACE,
        (conn) => {
          try {
            conn.register_object(
              "/org/freedesktop/Notifications",
              ifaceInfo,
              (
                _conn: Gio.DBusConnection,
                _sender: string,
                _path: string,
                _iface: string,
                method: string,
                params: GLib.Variant,
                invocation: Gio.DBusMethodInvocation
              ) => {
                if (method === "GetCapabilities") {
                  invocation.return_value(new GLib.Variant("(as)", [["body", "actions", "icon-static"]]))
                  return
                }
                if (method === "GetServerInformation") {
                  invocation.return_value(new GLib.Variant("(ssss)", ["miri-shell", "miri", "1.0", "1.2"]))
                  return
                }
                if (method === "Notify") {
                  const [appName, replacesId, appIcon, summary, body] = params.deepUnpack() as any
                  this.addNotification(appName, appIcon, summary, body)
                  const id = replacesId > 0 ? replacesId : this._nextId++
                  invocation.return_value(new GLib.Variant("(u)", [id]))
                  return
                }
                if (method === "CloseNotification") {
                  const [id] = params.deepUnpack() as any
                  this.dismiss(id)
                  invocation.return_value(null)
                  return
                }
                invocation.return_value(null)
              },
              null,
              null
            )
          } catch {
            // ignore
          }
        },
        null,
        null
      )
    } catch {
      // ignore
    }

    // 2. Continuous real-time DBus stream monitor (captures all live system notifications)
    try {
      let isCapturing = false
      let appName = ""
      let appIcon = ""
      let summary = ""
      let body = ""
      let stringCount = 0

      subprocess(
        ["dbus-monitor", "type='method_call',interface='org.freedesktop.Notifications',member='Notify'"],
        (line: string) => {
          const trimmed = line.trim()
          if (trimmed.includes("member=Notify")) {
            isCapturing = true
            appName = ""
            appIcon = ""
            summary = ""
            body = ""
            stringCount = 0
            return
          }

          if (isCapturing) {
            const strMatch = trimmed.match(/^string "(.*)"$/)
            if (strMatch) {
              stringCount++
              const val = strMatch[1]
              if (stringCount === 1) {
                appName = val
              } else if (stringCount === 2) {
                appIcon = val
              } else if (stringCount === 3) {
                summary = val
              } else if (stringCount === 4) {
                body = val
                this.addNotification(appName, appIcon, summary, body)
                isCapturing = false
              }
            } else if (trimmed.startsWith("array [") && stringCount >= 3) {
              // Body was empty
              this.addNotification(appName, appIcon, summary, body)
              isCapturing = false
            }
          }
        }
      )
    } catch {
      // ignore
    }
  }

  public dismiss(id: number) {
    const list = this.notifications().filter((n) => n.id !== id)
    this._notifications[1](list)
  }

  public clearAll() {
    this._notifications[1]([])
  }
}

export const Notifications = new NotificationService()
export default Notifications
