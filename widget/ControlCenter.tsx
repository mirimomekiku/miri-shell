import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Brightness from "../service/brightness"
import Bluetooth from "../service/bluetooth"
import Network from "../service/network"
import ControlCenter from "../service/controlcenter"

export default function ControlCenterWidget() {
  return (
    <box class="ControlCenterCard" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* 1. Quick Toggles Row (Wi-Fi, DND, Timer, Bluetooth) */}
      <box class="quick-toggles-row" spacing={8} valign={Gtk.Align.CENTER}>
        {/* Toggle 1: Wi-Fi */}
        <button
          class={createComputed(() => `toggle-btn wifi ${Network.isConnected() ? "active" : ""}`)}
          hexpand={true}
        >
          <box spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Network.icon} />
            <label class="text" label={Network.ssid} ellipsize={3} maxWidthChars={7} />
          </box>
        </button>

        {/* Toggle 2: Do Not Disturb */}
        <button
          class={createComputed(() => `toggle-btn dnd ${ControlCenter.dnd() ? "active" : ""}`)}
          hexpand={true}
          onClicked={() => ControlCenter.toggleDnd()}
        >
          <box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
            <label class="icon" label={createComputed(() => (ControlCenter.dnd() ? "󰂛" : "󰂚"))} />
          </box>
        </button>

        {/* Toggle 3: Timer / Idle */}
        <button
          class="toggle-btn timer"
          hexpand={true}
          onClicked={() => ControlCenter.cycleTimer()}
        >
          <box spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
            <label class="icon" label="󱎫" />
            <label class="text" label={ControlCenter.timerText} />
          </box>
        </button>

        {/* Toggle 4: Bluetooth */}
        <button
          class={createComputed(() => `toggle-btn bluetooth ${Bluetooth.isPowered() ? "active" : ""}`)}
          hexpand={true}
          onClicked={() => Bluetooth.togglePower()}
        >
          <box spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Bluetooth.icon} />
            <label class="text" label={Bluetooth.statusText} />
          </box>
        </button>
      </box>

      {/* 2. Brightness Slider */}
      <box class="sliders-section" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <box class="slider-row brightness" spacing={10} valign={Gtk.Align.CENTER}>
          <box class="slider-icon-btn">
            <label class="icon" label={Brightness.icon} />
          </box>
          <slider
            class="cc-slider brightness"
            hexpand={true}
            value={Brightness.brightnessRatio}
            onDragged={({ value }) => Brightness.setBrightness(Math.round(value * 100))}
          />
          <label class="slider-text" label={Brightness.percentageText} />
        </box>
      </box>
    </box>
  )
}
