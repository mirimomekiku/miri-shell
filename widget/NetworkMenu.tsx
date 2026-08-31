import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Network, { WifiAccessPoint } from "../service/network"

export default function NetworkMenu() {
  return (
    <box class="NetworkMenuCard" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {/* 1. Header (Wi-Fi Badge + "Wi-Fi" + Spinner/Refresh) */}
      <box class="network-header" spacing={12} valign={Gtk.Align.CENTER}>
        <box class="wifi-badge" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="badge-icon" label="󰤨" />
        </box>

        <label class="header-title" label="Wi-Fi" hexpand={true} xalign={0} />

        <button
          class={createComputed(() => `rescan-btn ${Network.isScanning() ? "spinning" : ""}`)}
          valign={Gtk.Align.CENTER}
          onClicked={() => Network.rescan()}
        >
          <label label="󰑐" />
        </button>
      </box>

      {/* 2. Networks List */}
      <scrollable
        class="network-scrollable"
        hscroll={Gtk.PolicyType.NEVER}
        vscroll={Gtk.PolicyType.AUTOMATIC}
      >
        <box
          class="network-list"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={3}
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
                for (const ap of list.slice(0, 14)) {
                  const btn = (
                    <button
                      class={`network-item-btn ${ap.inUse ? "connected-item" : ""}`}
                      onClicked={() => Network.connect(ap)}
                    >
                      <box spacing={10} valign={Gtk.Align.CENTER}>
                        {/* Signal Icon & Lock */}
                        <box class="signal-box" spacing={2} valign={Gtk.Align.CENTER}>
                          <label class="signal-icon" label={ap.icon} />
                          {ap.isLocked ? <label class="lock-icon" label="󰌾" /> : null}
                        </box>

                        {/* SSID Name */}
                        <label
                          class="ssid-name"
                          label={ap.ssid}
                          xalign={0}
                          hexpand={true}
                          ellipsize={3}
                          maxWidthChars={24}
                        />

                        {/* Connected Checkmark Indicator */}
                        {ap.inUse ? <label class="check-icon" label="✓" /> : null}
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

      {/* 3. Footer Divider & "All Networks" Button */}
      <box class="network-footer" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        <box class="footer-divider" />
        <button
          class="all-networks-btn"
          xalign={0}
          onClicked={() => Network.openSettings()}
        >
          <label class="all-networks-text" label="All Networks" xalign={0} />
        </button>
      </box>
    </box>
  )
}
