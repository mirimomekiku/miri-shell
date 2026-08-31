import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Network, { WifiAccessPoint } from "../service/network"

export default function NetworkMenu() {
  return (
    <box class="NetworkMenuCard" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      {/* 1. Header */}
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

      {/* 2. Password Prompt (Revealed when network clicked needs auth) */}
      <revealer
        revealChild={createComputed(() => Boolean(Network.passwordTarget()))}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box class="password-box" orientation={Gtk.Orientation.VERTICAL} spacing={6}>
          <label
            class="password-prompt-label"
            label={createComputed(() => `Password for ${Network.passwordTarget()}:`)}
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

      {/* 3. Status Feedback Banner (if connecting or message active) */}
      <revealer
        revealChild={createComputed(() => Boolean(Network.statusMessage()))}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={150}
      >
        <box class="status-banner" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <label class="status-text" label={Network.statusMessage} />
        </box>
      </revealer>

      {/* 4. Networks List */}
      <scrollable
        class="network-scrollable"
        hscroll={Gtk.PolicyType.NEVER}
        vscroll={Gtk.PolicyType.AUTOMATIC}
      >
        <box
          class="network-list"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={4}
          $={(self) => {
            const createNetworkButton = (ap: WifiAccessPoint) => (
              <button
                class={`network-item-btn ${ap.inUse ? "connected-item" : ""} ${ap.isSaved ? "saved-item" : "unsaved-item"}`}
                onClicked={() => Network.handleNetworkClick(ap)}
              >
                <box spacing={10} valign={Gtk.Align.CENTER}>
                  {/* Signal Icon (Blue if saved, Greyed out if unsaved) & Lock */}
                  <box class="signal-box" spacing={2} valign={Gtk.Align.CENTER}>
                    <label
                      class={`signal-icon ${ap.isSaved ? "saved" : "unsaved"}`}
                      label={ap.icon}
                    />
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
                const savedList = list.filter((ap) => ap.isSaved)
                const unsavedList = list.filter((ap) => !ap.isSaved)

                // 1. Saved Networks Section
                if (savedList.length > 0) {
                  self.add(
                    <label
                      class="network-section-label"
                      label="Saved Networks"
                      xalign={0}
                    />
                  )
                  for (const ap of savedList) {
                    self.add(createNetworkButton(ap))
                  }
                }

                // 2. Available Networks Section
                if (unsavedList.length > 0) {
                  if (savedList.length > 0) {
                    self.add(
                      <label
                        class="network-section-label other"
                        label="Available Networks"
                        xalign={0}
                      />
                    )
                  }
                  for (const ap of unsavedList.slice(0, 10)) {
                    self.add(createNetworkButton(ap))
                  }
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

      {/* 5. Footer Divider & "All Networks" Button */}
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
