import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import BatteryWidget from "./Battery"
import AudioWidget from "./Audio"
import Workspaces from "./Workspaces"
import NetworkWidget from "./Network"
import Clock from "./Clock"
import ControlCenterWidget from "./ControlCenter"
import MediaCard from "./MediaPopup"
import ControlCenter from "../service/controlcenter"
import Media from "../service/media"

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

          {/* 2. Audio (Click to toggle Media Controls, scroll to change volume) */}
          <AudioWidget />

          {/* 3. Workspaces (1 2 3 4 5) */}
          <Workspaces />

          {/* 4. Network / Wi-Fi */}
          <NetworkWidget />

          {/* 5. Battery */}
          <BatteryWidget />
        </box>

        {/* 1. Slide-down Media & Audio Controls (Exclusive to clicking Sound icon) */}
        <revealer
          revealChild={Media.isOpen}
          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
          transitionDuration={250}
        >
          <MediaCard />
        </revealer>

        {/* 2. Slide-down Control Center (Exclusive to clicking Time/Date) */}
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
