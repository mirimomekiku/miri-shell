import { Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import Brightness from "../service/brightness"
import Bluetooth, { BluetoothDevice } from "../service/bluetooth"
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
          onClicked={() => Network.toggleOpen()}
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

        {/* Toggle 4: Bluetooth (Click to expand devices container) */}
        <button
          class={createComputed(() => `toggle-btn bluetooth ${Bluetooth.isPowered() ? "active" : ""} ${Bluetooth.isExpanded() ? "expanded" : ""}`)}
          hexpand={true}
          onClicked={() => Bluetooth.toggleExpanded()}
        >
          <box spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Bluetooth.icon} />
            <label class="text" label={Bluetooth.statusText} />
          </box>
        </button>
      </box>

      {/* 2. Expandable Bluetooth Devices Container (Matching Image 2 Reference Design) */}
      <revealer
        revealChild={Bluetooth.isExpanded}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box class="bluetooth-expanded-panel" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
          {/* Bluetooth Subheader (Title + "Visible as ...") */}
          <box class="bt-sub-header" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <box spacing={8} valign={Gtk.Align.CENTER}>
              <label class="bt-title" label="Bluetooth" hexpand={true} xalign={0} />

              <button
                class={createComputed(() => `bt-rescan-btn ${Bluetooth.isScanning() ? "spinning" : ""}`)}
                valign={Gtk.Align.CENTER}
                onClicked={() => Bluetooth.rescan()}
              >
                <label label="󰑐" />
              </button>

              <button
                class="bt-power-btn"
                valign={Gtk.Align.CENTER}
                onClicked={() => Bluetooth.togglePower()}
              >
                <label label="󰐥" />
              </button>
            </box>

            <label class="bt-visible-text" label={Bluetooth.visibleAsText} xalign={0} />
          </box>

          {/* Status Message Banner if any */}
          <revealer
            revealChild={createComputed(() => Boolean(Bluetooth.statusMessage()))}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={150}
          >
            <box class="bt-status-banner" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
              <label class="bt-status-text" label={Bluetooth.statusMessage} />
            </box>
          </revealer>

          {/* Bluetooth Devices Pill List (Image 2 Style) */}
          <scrollable
            class="bt-scrollable"
            hscroll={Gtk.PolicyType.NEVER}
            vscroll={Gtk.PolicyType.AUTOMATIC}
          >
            <box
              class="bt-device-list"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={6}
              $={(self) => {
                const render = () => {
                  self.get_children().forEach((ch) => ch.destroy())
                  const list = Bluetooth.devices()

                  if (!Bluetooth.isPowered()) {
                    self.add(
                      <box class="empty-bt" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                        <label class="empty-text" label="Bluetooth is turned off" />
                      </box>
                    )
                  } else if (list.length === 0) {
                    self.add(
                      <box class="empty-bt" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                        <label
                          class="empty-text"
                          label={Bluetooth.isScanning() ? "Searching for devices..." : "No devices found"}
                        />
                      </box>
                    )
                  } else {
                    for (const dev of list.slice(0, 10)) {
                      const isConn = dev.connected
                      const isPaired = dev.paired

                      const btn = (
                        <button
                          class={`bt-pill-item ${isConn ? "connected-pill" : "available-pill"}`}
                          onClicked={() => Bluetooth.handleDeviceClick(dev)}
                          onButtonPressEvent={(_, event) => {
                            const [, button] = event.get_button()
                            // Right-click to forget paired device
                            if (button === 3 && isPaired) {
                              Bluetooth.forget(dev)
                              return true
                            }
                            return false
                          }}
                        >
                          <box spacing={12} valign={Gtk.Align.CENTER}>
                            {/* Icon (Linked chain for paired, Bluetooth for connected/available) */}
                            <label
                              class={`bt-pill-icon ${isConn ? "conn-icon" : ""}`}
                              label={isConn ? "󰂯" : isPaired ? "󰌷" : "󰂯"}
                            />

                            {/* Device Name & Subtitle */}
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand={true}>
                              <label
                                class={`bt-device-name ${isConn ? "conn-text" : ""}`}
                                label={dev.name}
                                xalign={0}
                                ellipsize={3}
                                maxWidthChars={20}
                              />
                              <label
                                class={`bt-device-sub ${isConn ? "conn-sub" : ""}`}
                                label={isConn ? "Connected" : isPaired ? "Paired • right-click to forget" : "Not paired"}
                                xalign={0}
                              />
                            </box>
                          </box>
                        </button>
                      )
                      self.add(btn)
                    }
                  }
                  self.show_all()
                }

                // Initial render
                render()
                // Subscribe to state updates
                Bluetooth.devices.subscribe(render)
                Bluetooth.isPowered.subscribe(render)
                Bluetooth.isScanning.subscribe(render)
              }}
            />
          </scrollable>
        </box>
      </revealer>

      {/* 3. Brightness Slider */}
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
