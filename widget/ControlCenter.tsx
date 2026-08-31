import { Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import Brightness from "../service/brightness"
import Bluetooth, { BluetoothDevice } from "../service/bluetooth"
import Network from "../service/network"
import ControlCenter from "../service/controlcenter"
import Notifications, { NotificationItem } from "../service/notifications"
import Capture from "../service/capture"

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

      {/* 4. Notifications Section (Longer Height + Reference Design) */}
      <box class="notifications-panel" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        {/* Header: "Notifications (3)" + "Clear all" */}
        <box class="notif-header" spacing={8} valign={Gtk.Align.CENTER}>
          <label
            class="notif-header-title"
            label={Notifications.headerText}
            hexpand={true}
            xalign={0}
          />
          <button
            class="notif-clear-btn"
            valign={Gtk.Align.CENTER}
            onClicked={() => Notifications.clearAll()}
          >
            <label label="Clear all" />
          </button>
        </box>

        {/* Scrollable Notifications List */}
        <scrollable
          class="notif-scrollable"
          hscroll={Gtk.PolicyType.NEVER}
          vscroll={Gtk.PolicyType.AUTOMATIC}
        >
          <box
            class="notif-list"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={6}
            $={(self) => {
              const render = () => {
                self.get_children().forEach((ch) => ch.destroy())
                const list = Notifications.notifications()

                if (list.length === 0) {
                  self.add(
                    <box class="empty-notif" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                      <label class="empty-text" label="No notifications" />
                    </box>
                  )
                } else {
                  for (const n of list) {
                    const item = (
                      <box class="notif-card-item" spacing={10} valign={Gtk.Align.START}>
                        {/* App Icon */}
                        <icon
                          class="notif-icon"
                          icon={n.appIcon || "dialog-information"}
                          pixelSize={24}
                          valign={Gtk.Align.START}
                        />

                        {/* Content */}
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={3} hexpand={true}>
                          {/* Title + Timestamp + Close */}
                          <box spacing={6} valign={Gtk.Align.CENTER}>
                            <label
                              class="notif-title"
                              label={n.summary}
                              hexpand={true}
                              xalign={0}
                              ellipsize={3}
                              maxWidthChars={20}
                            />
                            <label class="notif-time" label={n.time} />
                            <button
                              class="notif-close-btn"
                              valign={Gtk.Align.CENTER}
                              onClicked={() => Notifications.dismiss(n.id)}
                            >
                              <label label="✕" />
                            </button>
                          </box>

                          {/* Body */}
                          <label
                            class="notif-body"
                            label={n.body}
                            xalign={0}
                            wrap={true}
                            maxWidthChars={30}
                          />
                        </box>
                      </box>
                    )
                    self.add(item)
                  }
                }
                self.show_all()
              }

              render()
              Notifications.notifications.subscribe(render)
            }}
          />
        </scrollable>
      </box>

      {/* 5. Quick Utilities Bar: Screenshot, Screen Record, Settings (Circular Icons, Right-Aligned) */}
      <box class="quick-utilities-row" spacing={8} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
        {/* Screenshot Button */}
        <button
          class="circular-utility-btn screenshot"
          tooltipText="Take Screenshot"
          valign={Gtk.Align.CENTER}
          onClicked={() => Capture.takeScreenshot("region")}
        >
          <label class="icon" label="󰄀" />
        </button>

        {/* Screen Record Button */}
        <button
          class={createComputed(() => `circular-utility-btn record ${Capture.isRecording() ? "recording" : ""}`)}
          tooltipText="Toggle Screen Recording"
          valign={Gtk.Align.CENTER}
          onClicked={() => Capture.toggleRecording()}
        >
          <label class="icon" label={Capture.recordIcon} />
        </button>

        {/* Settings Button */}
        <button
          class="circular-utility-btn settings"
          tooltipText="Settings"
          valign={Gtk.Align.CENTER}
          onClicked={() => Capture.openSettings()}
        >
          <label class="icon" label="󰒓" />
        </button>
      </box>
    </box>
  )
}
