import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Network, { WifiAccessPoint } from "../service/network"

export default function NetworkMenu() {
  return (
    <box class="NetworkMenuCard" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {/* 1. Header (Title "Wi-Fi" + Rescan) */}
      <box class="network-header" spacing={10} valign={Gtk.Align.CENTER}>
        <label class="header-title" label="Wi-Fi" hexpand={true} xalign={0} />

        <button
          class={createComputed(() => `rescan-btn ${Network.isScanning() ? "spinning" : ""}`)}
          valign={Gtk.Align.CENTER}
          onClicked={() => Network.rescan()}
        >
          <label label="󰑐" />
        </button>
      </box>

      {/* 2. Password Prompt (Revealed when network clicked needs password) */}
      <revealer
        revealChild={createComputed(() => Boolean(Network.passwordTarget()))}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box class="password-box" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label
            class="password-prompt-label"
            label={createComputed(() => `Password for "${Network.passwordTarget()}":`)}
            xalign={0}
          />
          <box spacing={6} valign={Gtk.Align.CENTER}>
            <entry
              class="password-entry"
              visibility={false}
              placeholderText="Enter password..."
              hexpand={true}
              text={Network.passwordInput}
              onChanged={(self) => Network.setPasswordInput(self.get_text())}
              onActivate={() => Network.submitPassword()}
            />
            <button
              class="password-submit-btn"
              onClicked={() => Network.submitPassword()}
            >
              <label label="Connect" />
            </button>
            <button
              class="password-cancel-btn"
              onClicked={() => Network.cancelPassword()}
            >
              <label label="✕" />
            </button>
          </box>
        </box>
      </revealer>

      {/* 3. Status Feedback Banner */}
      <revealer
        revealChild={createComputed(() => Boolean(Network.statusMessage()))}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={150}
      >
        <box class="status-banner" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="status-text" label={Network.statusMessage} />
        </box>
      </revealer>

      {/* 4. Networks Pill List (Matching Image 1 Reference Design) */}
      <scrollable
        class="network-scrollable"
        hscroll={Gtk.PolicyType.NEVER}
        vscroll={Gtk.PolicyType.AUTOMATIC}
      >
        <box
          class="network-list"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={6}
          $={(self) => {
            const render = () => {
              self.get_children().forEach((ch) => ch.destroy())
              const list = Network.networks()

              if (list.length === 0) {
                const emptyBox = (
                  <box class="empty-networks" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                    <label
                      class="empty-text"
                      label={Network.isScanning() ? "Scanning for networks..." : "No networks found"}
                    />
                  </box>
                )
                self.add(emptyBox)
              } else {
                for (const ap of list.slice(0, 10)) {
                  const isConn = ap.inUse
                  const btn = (
                    <button
                      class={`wifi-pill-item ${isConn ? "connected-pill" : "available-pill"}`}
                      onClicked={() => Network.handleNetworkClick(ap)}
                    >
                      <box spacing={12} valign={Gtk.Align.CENTER}>
                        {/* Lock / Security Icon */}
                        <label
                          class={`wifi-lock-icon ${isConn ? "conn-icon" : ""}`}
                          label={ap.isLocked ? "󰌾" : "󰤨"}
                        />

                        {/* SSID Name & Status/Percentage */}
                        <box orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand={true}>
                          <label
                            class={`wifi-ssid-name ${isConn ? "conn-text" : ""}`}
                            label={ap.ssid}
                            xalign={0}
                            ellipsize={3}
                            maxWidthChars={20}
                          />
                          <label
                            class={`wifi-sub-text ${isConn ? "conn-sub" : ""}`}
                            label={isConn ? "Connected" : `${ap.signal}%`}
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
            // Subscribe to reactive changes
            Network.networks.subscribe(render)
            Network.isScanning.subscribe(render)
          }}
        />
      </scrollable>
    </box>
  )
}
