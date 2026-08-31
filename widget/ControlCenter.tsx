import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Media from "../service/media"
import Audio from "../service/audio"
import Brightness from "../service/brightness"
import Bluetooth from "../service/bluetooth"
import Network from "../service/network"
import ControlCenter from "../service/controlcenter"

export default function ControlCenterWidget() {
  const coverArtCss = createComputed(() => {
    const url = Media.artUrl()
    if (url) {
      return `background-image: url("${url}"); background-size: cover; background-position: center;`
    }
    return ""
  })

  return (
    <box class="ControlCenterCard" orientation={Gtk.Orientation.VERTICAL} spacing={14}>
      {/* ========================================================= */}
      {/* 1. Media Section */}
      {/* ========================================================= */}
      <box class="cc-section media-box" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <box class="media-top-row" spacing={12} valign={Gtk.Align.CENTER}>
          {/* Album Art (48px) */}
          <box
            class="album-art"
            css={coverArtCss}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
          >
            <label
              class="fallback-icon"
              label="󰎆"
              visible={createComputed(() => !Media.artUrl())}
              valign={Gtk.Align.CENTER}
              halign={Gtk.Align.CENTER}
            />
          </box>

          {/* Track Title & Artist */}
          <box class="media-meta" orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand={true}>
            <label
              class="media-title"
              label={Media.title}
              xalign={0}
              ellipsize={3}
              maxWidthChars={20}
            />
            <label
              class="media-artist"
              label={Media.artist}
              xalign={0}
              ellipsize={3}
              maxWidthChars={24}
            />
          </box>

          {/* Media Playback Controls (Prev - Play/Pause - Next) */}
          <box class="media-controls" spacing={6} valign={Gtk.Align.CENTER}>
            <button class="ctrl-btn" onClicked={() => Media.previous()}>
              <label label="󰒮" />
            </button>
            <button class="ctrl-btn play" onClicked={() => Media.playPause()}>
              <label label={Media.playPauseIcon} />
            </button>
            <button class="ctrl-btn" onClicked={() => Media.next()}>
              <label label="󰒭" />
            </button>
          </box>
        </box>

        {/* Media Full-Width Progress Slider */}
        <box class="media-progress-row" spacing={8} valign={Gtk.Align.CENTER}>
          <label class="time-label" label={Media.positionStr} />
          <slider
            class="media-slider"
            hexpand={true}
            value={Media.progress}
            onDragged={({ value }) => Media.setPositionRatio(value)}
          />
          <label class="time-label" label={Media.lengthStr} />
        </box>
      </box>

      {/* ========================================================= */}
      {/* 2. Quick Toggles Row */}
      {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* 3. Sliders (Volume & Brightness) */}
      {/* ========================================================= */}
      <box class="sliders-section" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        {/* Volume Slider */}
        <box class="slider-row volume" spacing={10} valign={Gtk.Align.CENTER}>
          <button class="slider-icon-btn" onClicked={() => Audio.toggleMute()}>
            <label class="icon" label={Audio.icon} />
          </button>
          <slider
            class="cc-slider volume"
            hexpand={true}
            value={Audio.volumeRatio}
            onDragged={({ value }) => Audio.setVolume(Math.round(value * 100))}
          />
          <label class="slider-text" label={Audio.percentageText} />
        </box>

        {/* Brightness Slider */}
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
