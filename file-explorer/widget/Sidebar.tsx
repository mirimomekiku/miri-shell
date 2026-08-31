import { Gtk, Gdk } from "ags/gtk3"
import { createRoot, createComputed } from "gnim"
import GLib from "gi://GLib?version=2.0"
import FS from "../service/fs"
import { Lucide } from "../service/icons"

interface Place {
  name: string
  path: string
  icon: string
}

export default function Sidebar() {
  const home = GLib.get_home_dir()

  const places: Place[] = [
    { name: "Home", path: home, icon: Lucide["home"] },
    { name: "Projects", path: `${home}/Projects`, icon: Lucide["folder-git"] },
    { name: "Downloads", path: `${home}/Downloads`, icon: Lucide["download"] },
    { name: "Documents", path: `${home}/Documents`, icon: Lucide["file-text"] },
    { name: "Pictures", path: `${home}/Pictures`, icon: Lucide["image"] },
    { name: "Music", path: `${home}/Music`, icon: Lucide["music"] },
    { name: "Videos", path: `${home}/Videos`, icon: Lucide["video"] },
    { name: "Root System", path: "/", icon: Lucide["hard-drive"] },
  ]

  const showPinnedContextMenu = (event: Gdk.Event, path: string) => {
    const menu = new Gtk.Menu()
    const unpinItem = new Gtk.MenuItem({ label: "Unpin from Sidebar" })
    unpinItem.connect("activate", () => FS.unpinFolder(path))
    menu.append(unpinItem)

    const termItem = new Gtk.MenuItem({ label: "Open in Terminal" })
    termItem.connect("activate", () => FS.openInTerminal(path))
    menu.append(termItem)

    menu.show_all()
    menu.popup_at_pointer(event)
  }

  return (
    <scrollable
      class="SidebarScrollable"
      hscroll={Gtk.PolicyType.NEVER}
      vscroll={Gtk.PolicyType.AUTOMATIC}
      hexpand={false}
      vexpand={true}
    >
      <box class="Sidebar" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        {/* 1. PINNED / QUICK ACCESS SECTION */}
        <box class="sidebar-section pinned-section" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          {/* Section Header with Expand/Collapse Toggle */}
          <button
            class="sidebar-heading-btn"
            onClicked={() => FS.togglePinnedExpanded()}
          >
            <box spacing={6} valign={Gtk.Align.CENTER}>
              <label
                class="icon collapse-icon"
                label={createComputed(() =>
                  FS.pinnedExpanded() ? Lucide["chevron-down"] : Lucide["chevron-right"]
                )}
              />
              <label class="sidebar-heading" label="PINNED" xalign={0} hexpand={true} />
              <label
                class="pinned-count-badge"
                label={createComputed(() => `${FS.pinned().length}`)}
              />
            </box>
          </button>

          {/* Collapsible Pinned List */}
          <revealer
            revealChild={FS.pinnedExpanded}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={160}
          >
            <box
              class="pinned-list"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={2}
              $={(self) => {
                let disposeRoot: (() => void) | null = null

                const render = () => {
                  if (disposeRoot) {
                    disposeRoot()
                    disposeRoot = null
                  }
                  self.get_children().forEach((ch) => ch.destroy())
                  const current = FS.currentPath()
                  const pinned = FS.pinnedList()

                  createRoot((dispose) => {
                    disposeRoot = dispose

                    if (pinned.length === 0) {
                      const emptyLabel = (
                        <box class="empty-pinned">
                          <label class="empty-pinned-text" label="No pinned folders yet" xalign={0} />
                        </box>
                      )
                      self.add(emptyLabel)
                    } else {
                      for (const p of pinned) {
                        const isActive = current === p.path || current.startsWith(p.path + "/")

                        const btn = (
                          <button
                            class={`sidebar-item-btn pinned-item ${isActive ? "active" : ""}`}
                            tooltipText={p.path}
                            onClicked={() => FS.navigateTo(p.path)}
                            onButtonPressEvent={(_, event) => {
                              const [, button] = event.get_button()
                              if (button === 3) {
                                showPinnedContextMenu(event, p.path)
                                return true
                              }
                              return false
                            }}
                          >
                            <box spacing={10} valign={Gtk.Align.CENTER}>
                              <label class="icon item-icon" label={p.icon} />
                              <label class="name" label={p.name} xalign={0} hexpand={true} ellipsize={3} />
                              <button
                                class="unpin-quick-btn"
                                tooltipText="Unpin from Sidebar"
                                onClicked={() => FS.unpinFolder(p.path)}
                              >
                                <label class="icon" label={Lucide["x"]} />
                              </button>
                            </box>
                          </button>
                        )
                        self.add(btn)
                      }
                    }
                  })
                  self.show_all()
                }

                render()
                FS.currentPath.subscribe(render)
                FS.pinned.subscribe(render)
              }}
            />
          </revealer>
        </box>

        {/* 2. PLACES SECTION */}
        <box class="sidebar-section places-section" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <label class="sidebar-heading" label="PLACES" xalign={0} />

          <box
            class="places-list"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={2}
            $={(self) => {
              let disposeRoot: (() => void) | null = null

              const render = () => {
                if (disposeRoot) {
                  disposeRoot()
                  disposeRoot = null
                }
                self.get_children().forEach((ch) => ch.destroy())
                const current = FS.currentPath()

                createRoot((dispose) => {
                  disposeRoot = dispose

                  for (const place of places) {
                    const isActive =
                      current === place.path ||
                      (place.path !== "/" && place.path !== home && current.startsWith(place.path))

                    const btn = (
                      <button
                        class={`sidebar-item-btn ${isActive ? "active" : ""}`}
                        onClicked={() => FS.navigateTo(place.path)}
                      >
                        <box spacing={10} valign={Gtk.Align.CENTER}>
                          <label class="icon item-icon" label={place.icon} />
                          <label class="name" label={place.name} xalign={0} hexpand={true} />
                        </box>
                      </button>
                    )
                    self.add(btn)
                  }
                })
                self.show_all()
              }

              render()
              FS.currentPath.subscribe(render)
            }}
          />
        </box>
      </box>
    </scrollable>
  )
}
