import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import BatteryWidget from "./Battery"
import AudioWidget from "./Audio"
import Workspaces from "./Workspaces"
import NetworkWidget from "./Network"
import Clock from "./Clock"
import ControlCenterWidget from "./ControlCenter"
import ControlCenter from "../service/controlcenter"

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
      <box class="BarContainer" orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
        {/* Top Pill Bar Row */}
        <box class="PillBar" spacing={16} valign={Gtk.Align.CENTER}>
          {/* 1. Time (Click to toggle Control Center) */}
          <Clock />

          {/* 2. Audio (Click to toggle Control Center, scroll to change volume) */}
          <AudioWidget />

          {/* 3. Workspaces (1 2 3 4 5) */}
          <Workspaces />

          {/* 4. Network / Wi-Fi */}
          <NetworkWidget />

          {/* 5. Battery */}
          <BatteryWidget />
        </box>

        {/* Slide-down Control Center */}
        <revealer
          revealChild={ControlCenter.isOpen}
          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
          transitionDuration={250}
        >
          <ControlCenterWidget />
        </revealer>
      </box>
    </window>
  )
}
