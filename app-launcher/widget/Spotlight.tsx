import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import { createRoot, createComputed } from "gnim"
import Apps, { LauncherItem } from "../service/apps"
import { Lucide } from "../service/icons"

export default function SpotlightModal() {
  return (
    <window
      class="SpotlightWindow"
      name="app-launcher"
      title="Spotlight"
      application={app}
      defaultWidth={620}
      defaultHeight={420}
      onKeyPressEvent={(_, event) => {
        const [, keyval] = event.get_keyval()

        // Escape: Close launcher
        if (keyval === Gdk.KEY_Escape) {
          app.quit()
          return true
        }

        // Down / Tab: Select Next
        if (keyval === Gdk.KEY_Down || keyval === Gdk.KEY_Tab) {
          Apps.selectNext()
          return true
        }

        // Up: Select Previous
        if (keyval === Gdk.KEY_Up) {
          Apps.selectPrev()
          return true
        }

        // Enter / Return: Launch Selected
        if (keyval === Gdk.KEY_Return || keyval === Gdk.KEY_KP_Enter) {
          Apps.launchSelected()
          return true
        }

        return false
      }}
    >
      <box
        class="SpotlightCard"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={0}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        hexpand={true}
        vexpand={true}
      >
        {/* 1. Spotlight Search Header */}
        <box class="spotlight-search-header" spacing={12} valign={Gtk.Align.CENTER}>
          <label class="search-lead-icon icon" label={Lucide["search"]} />
          <entry
            class="spotlight-entry"
            hexpand={true}
            placeholderText="Search apps, files, math, or type > for terminal..."
            text={Apps.query}
            onChanged={(self) => Apps.setQuery(self.get_text())}
            onActivate={() => Apps.launchSelected()}
            $={(self) => {
              // Auto-focus on launch
              setTimeout(() => self.grab_focus(), 50)
            }}
          />
          {createComputed(() =>
            Apps.query() ? (
              <button
                class="search-clear-btn"
                valign={Gtk.Align.CENTER}
                onClicked={() => Apps.setQuery("")}
              >
                <label class="icon" label={Lucide["x"]} />
              </button>
            ) : null
          )}
        </box>

        {/* 2. Results List (Scrollable) */}
        <scrollable
          class="results-scrollable"
          hexpand={true}
          vexpand={true}
          hscroll={Gtk.PolicyType.NEVER}
          vscroll={Gtk.PolicyType.AUTOMATIC}
        >
          <box
            class="results-container"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={4}
            $={(self) => {
              let disposeRoot: (() => void) | null = null

              const render = () => {
                if (disposeRoot) {
                  disposeRoot()
                  disposeRoot = null
                }
                self.get_children().forEach((ch) => ch.destroy())
                const list = Apps.results()
                const selectedIdx = Apps.selectedIndex()

                createRoot((dispose) => {
                  disposeRoot = dispose

                  if (list.length === 0) {
                    const empty = (
                      <box
                        class="empty-results-box"
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={6}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                      >
                        <label class="empty-icon icon" label={Lucide["search"]} />
                        <label class="empty-title" label="No matching applications" />
                        <label class="empty-sub" label="Type > to run a command or ? to search web" />
                      </box>
                    )
                    self.add(empty)
                  } else {
                    list.forEach((item, idx) => {
                      const isSelected = idx === selectedIdx

                      const rowBtn = (
                        <button
                          class={`result-item-btn ${isSelected ? "selected" : ""}`}
                          onClicked={() => Apps.launchItem(item)}
                        >
                          <box spacing={12} valign={Gtk.Align.CENTER}>
                            {/* App / Category Icon */}
                            {item.lucideIcon ? (
                              <label class="item-lucide-icon icon" label={item.lucideIcon} />
                            ) : (
                              <icon
                                class="item-app-icon"
                                icon={item.iconName || "application-x-executable"}
                                pixelSize={28}
                              />
                            )}

                            {/* Title & Subtitle */}
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand={true}>
                              <label
                                class="item-title"
                                label={item.name}
                                xalign={0}
                                ellipsize={3}
                                maxWidthChars={35}
                              />
                              <label
                                class="item-subtitle"
                                label={item.subtitle}
                                xalign={0}
                                ellipsize={3}
                                maxWidthChars={45}
                              />
                            </box>

                            {/* Return key indicator on selected */}
                            {isSelected ? (
                              <box class="enter-badge" valign={Gtk.Align.CENTER}>
                                <label class="enter-label" label="↵ Return" />
                              </box>
                            ) : null}
                          </box>
                        </button>
                      )
                      self.add(rowBtn)
                    })
                  }
                })
                self.show_all()
              }

              render()
              Apps.results.subscribe(render)
              Apps.selectedIndex.subscribe(render)
            }}
          />
        </scrollable>

        {/* 3. Spotlight Footer Shortcuts Bar */}
        <box class="spotlight-footer" spacing={14} valign={Gtk.Align.CENTER}>
          <box class="footer-chip" spacing={4} valign={Gtk.Align.CENTER}>
            <label class="footer-key" label="↵" />
            <label class="footer-desc" label="Open" />
          </box>

          <box class="footer-chip" spacing={4} valign={Gtk.Align.CENTER}>
            <label class="footer-key" label="↑↓" />
            <label class="footer-desc" label="Navigate" />
          </box>

          <box class="footer-chip" spacing={4} valign={Gtk.Align.CENTER}>
            <label class="footer-key" label=">" />
            <label class="footer-desc" label="Terminal" />
          </box>

          <box class="footer-chip" spacing={4} valign={Gtk.Align.CENTER}>
            <label class="footer-key" label="?" />
            <label class="footer-desc" label="Web" />
          </box>

          <box class="footer-chip" spacing={4} valign={Gtk.Align.CENTER}>
            <label class="footer-key" label="esc" />
            <label class="footer-desc" label="Close" />
          </box>
        </box>
      </box>
    </window>
  )
}
