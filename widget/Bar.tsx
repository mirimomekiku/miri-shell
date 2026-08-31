import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import Workspaces from "./Workspaces"
import ActiveTitle from "./ActiveTitle"
import Clock from "./Clock"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox class="bar-inner">
        {/* Left: Workspaces */}
        <box $type="start" class="bar-section left" spacing={8} halign={Gtk.Align.START}>
          <Workspaces />
        </box>

        {/* Center: Focused Window Title */}
        <box $type="center" class="bar-section center" halign={Gtk.Align.CENTER}>
          <ActiveTitle />
        </box>

        {/* Right: Clock & Status */}
        <box $type="end" class="bar-section right" spacing={8} halign={Gtk.Align.END}>
          <Clock />
        </box>
      </centerbox>
    </window>
  )
}
