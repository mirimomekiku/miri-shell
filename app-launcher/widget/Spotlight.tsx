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
      defaultWidth={640}
      defaultHeight={440}
      onKeyPressEvent={(_, event) => {
        const [, keyval] = event.get_keyval()
        const [, state] = event.get_state()
        const isCtrl = Boolean(state & Gdk.ModifierType.CONTROL_MASK)
        const isAlt = Boolean(state & Gdk.ModifierType.MOD1_MASK)

        // Escape: Close launcher
        if (keyval === Gdk.KEY_Escape) {
          app.quit()
          return true
        }

        // Direct Index Shortcuts: Alt+1..8 or Ctrl+1..8
        if ((isAlt || isCtrl) && keyval >= Gdk.KEY_1 && keyval <= Gdk.KEY_8) {
          const idx = keyval - Gdk.KEY_1
          Apps.launchByIndex(idx)
          return true
        }

        // Down / Tab: Select Next
        if (keyval === Gdk.KEY_Down || (keyval === Gdk.KEY_Tab && !isAlt)) {
          Apps.selectNext()
          return true
        }

        // Up / Shift+Tab: Select Previous
        if (keyval === Gdk.KEY_Up || (keyval === Gdk.KEY_ISO_Left_Tab && !isAlt)) {
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

          {/* Active Mode Pill Indicator */}
          {createComputed(() => {
            const mode = Apps.activeMode()
            if (mode === "cmd") {
              return (
                <box class="mode-badge cmd" spacing={4} valign={Gtk.Align.CENTER}>
                  <label class="icon" label={Lucide["terminal"]} />
                  <label class="mode-text" label="Terminal" />
                </box>
              )
            }
            if (mode === "calc") {
              return (
                <box class="mode-badge calc" spacing={4} valign={Gtk.Align.CENTER}>
                  <label class="icon" label={Lucide["copy"]} />
                  <label class="mode-text" label="Calculator" />
                </box>
              )
            }
            if (mode === "web") {
              return (
                <box class="mode-badge web" spacing={4} valign={Gtk.Align.CENTER}>
                  <label class="icon" label={Lucide["search"]} />
                  <label class="mode-text" label="Web" />
                </box>
              )
            }
            return null
          })}

          <entry
            class="spotlight-entry"
            hexpand={true}
            placeholderText="Search apps, files, math, or type > for terminal..."
            text={Apps.query}
            onChanged={(self) => Apps.setQuery(self.get_text())}
            onActivate={() => Apps.launchSelected()}
            $={(self) => {
              setTimeout(() => self.grab_focus(), 50)
            }}
          />

          <button
            class="search-clear-btn"
            valign={Gtk.Align.CENTER}
            visible={createComputed(() => Boolean(Apps.query()))}
            onClicked={() => Apps.setQuery("")}
          >
            <label class="icon" label={Lucide["x"]} />
          </button>
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
                        spacing={8}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                      >
                        <label class="empty-icon icon" label={Lucide["search"]} />
                        <label class="empty-title" label="No matching applications found" />
                        <label class="empty-sub" label="Type > to run terminal commands or ? to search the web" />
                      </box>
                    )
                    self.add(empty)
                  } else {
                    list.forEach((item, idx) => {
                      const isSelected = idx === selectedIdx

                      const rowBtn = (
                        <button
                          class={`result-item-btn type-${item.type} ${isSelected ? "selected" : ""}`}
                          onClicked={() => Apps.launchItem(item)}
                        >
                          <box spacing={12} valign={Gtk.Align.CENTER}>
                            {/* App / Category Icon */}
                            {item.lucideIcon ? (
                              <label
                                class={`item-lucide-icon icon type-${item.type}`}
                                label={item.lucideIcon}
                              />
                            ) : (
                              <icon
                                class="item-app-icon"
                                icon={item.iconName || "application-x-executable"}
                                pixelSize={28}
                              />
                            )}

                            {/* Title & Subtitle */}
                            <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand={true}>
                              <box spacing={8} valign={Gtk.Align.CENTER}>
                                <label
                                  class="item-title"
                                  label={item.name}
                                  xalign={0}
                                  ellipsize={3}
                                  maxWidthChars={36}
                                />
                                {item.badge ? (
                                  <label
                                    class={`item-badge type-${item.type}`}
                                    label={item.badge}
                                  />
                                ) : null}
                              </box>

                              <label
                                class="item-subtitle"
                                label={item.subtitle}
                                xalign={0}
                                ellipsize={3}
                                maxWidthChars={48}
                              />
                            </box>

                            {/* Quick Number Shortcut (Alt+1..8) or Return key badge on selected */}
                            {isSelected ? (
                              <box class="enter-badge" valign={Gtk.Align.CENTER}>
                                <label class="enter-label" label="↵ Return" />
                              </box>
                            ) : (
                              <label class="num-shortcut-badge" label={`Alt+${idx + 1}`} />
                            )}
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
            <label class="footer-key" label="Alt+1..8" />
            <label class="footer-desc" label="Quick Launch" />
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
