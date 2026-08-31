import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"

export interface NotificationItem {
  id: number
  appName: string
  appIcon: string
  summary: string
  body: string
  time: string
  image?: string
}

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
    <method name="CloseNotification">
      <arg name="id" type="u" direction="in"/>
    </method>
    <method name="GetCapabilities">
      <arg name="capabilities" type="as" direction="out"/>
    </method>
    <method name="GetServerInformation">
      <arg name="name" type="s" direction="out"/>
      <arg name="vendor" type="s" direction="out"/>
      <arg name="version" type="s" direction="out"/>
      <arg name="spec_version" type="s" direction="out"/>
    </method>
    <signal name="NotificationClosed">
      <arg name="id" type="u"/>
      <arg name="reason" type="u"/>
    </signal>
    <signal name="ActionInvoked">
      <arg name="id" type="u"/>
      <arg name="action_key" type="s"/>
    </signal>
  </interface>
</node>`

class NotificationService {
  private _notifications = createState<NotificationItem[]>([
    {
      id: 1,
      appName: "Hyprshot",
      appIcon: "image-x-generic",
      summary: "Screenshot Saved",
      body: "Image saved in ~/Pictures/Screenshots and copied to clipboard.",
      time: "16:25",
    },
    {
      id: 2,
      appName: "Git",
      appIcon: "vcs-normal",
      summary: "Git Commit",
      body: "Committed changes to miri-shell repository.",
      time: "16:20",
    },
    {
      id: 3,
      appName: "System",
      appIcon: "security-high",
      summary: "VPN Not Active",
      body: "Your connection is unencrypted.",
      time: "16:15",
    },
  ])
  private _nextId = 4

  public readonly notifications = this._notifications[0]

  public readonly count = createComputed(() => {
    return this.notifications().length
  })

  public readonly headerText = createComputed(() => {
    return `Notifications (${this.count()})`
  })

  constructor() {
    this.registerDbus()
  }

  private registerDbus() {
    try {
      const nodeInfo = Gio.DBusNodeInfo.new_for_xml(ifaceXml)
      const ifaceInfo = nodeInfo.interfaces[0]

      const handleMethodCall = (
        _conn: Gio.DBusConnection,
        _sender: string,
        _objectPath: string,
        _interfaceName: string,
        methodName: string,
        parameters: GLib.Variant,
        invocation: Gio.DBusMethodInvocation
      ) => {
        if (methodName === "GetCapabilities") {
          const res = new GLib.Variant("(as)", [["body", "actions", "icon-static"]])
          invocation.return_value(res)
          return
        }

        if (methodName === "GetServerInformation") {
          const res = new GLib.Variant("(ssss)", ["miri-shell", "miri", "1.0", "1.2"])
          invocation.return_value(res)
          return
        }

        if (methodName === "Notify") {
          const [appName, replacesId, appIcon, summary, body, _actions, hints] = parameters.deepUnpack() as any
          const now = new Date()
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

          let id = replacesId > 0 ? replacesId : this._nextId++
          const item: NotificationItem = {
            id,
            appName: appName || "Application",
            appIcon: appIcon || "dialog-information",
            summary: summary || "",
            body: body || "",
            time,
          }

          const current = this.notifications()
          const filtered = current.filter((n) => n.id !== id)
          this._notifications[1]([item, ...filtered])

          invocation.return_value(new GLib.Variant("(u)", [id]))
          return
        }

        if (methodName === "CloseNotification") {
          const [id] = parameters.deepUnpack() as any
          this.dismiss(id)
          invocation.return_value(null)
          return
        }

        invocation.return_value(null)
      }

      Gio.bus_own_name(
        Gio.BusType.SESSION,
        "org.freedesktop.Notifications",
        Gio.BusNameOwnerFlags.REPLACE,
        (conn) => {
          try {
            conn.register_object(
              "/org/freedesktop/Notifications",
              ifaceInfo,
              handleMethodCall,
              null,
              null
            )
          } catch (e) {
            // ignore
          }
        },
        null,
        null
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
