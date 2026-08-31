import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import BatteryWidget from "./Battery"
import AudioWidget from "./Audio"
import Workspaces from "./Workspaces"
import NetworkWidget from "./Network"
import Clock from "./Clock"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor

  return (
    <window
      class="BarWindow"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP}
      application={app}
    >
      <box class="PillBar" spacing={16} valign={Gtk.Align.CENTER}>
        {/* 1. Time */}
        <Clock />

        {/* 2. Audio */}
        <AudioWidget />

        {/* 3. Workspaces (1 2 3 4 5) */}
        <Workspaces />

        {/* 4. Network / Wi-Fi */}
        <NetworkWidget />

        {/* 5. Battery */}
        <BatteryWidget />
      </box>
    </window>
  )
}
