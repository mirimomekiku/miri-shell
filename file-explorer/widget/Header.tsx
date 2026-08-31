import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import FS from "../service/fs"
import { Lucide } from "../service/icons"

export default function Header() {
  return (
    <box class="HeaderBar" spacing={10} valign={Gtk.Align.CENTER}>
      {/* 1. History & Navigation Buttons */}
      <box class="nav-buttons-box" spacing={4} valign={Gtk.Align.CENTER}>
        <button
          class={createComputed(() => `nav-btn ${!FS.canGoBack() ? "disabled" : ""}`)}
          tooltipText="Go Back (Alt+Left)"
          onClicked={() => FS.goBack()}
        >
          <label class="icon" label={Lucide["arrow-left"]} />
        </button>

        <button
          class={createComputed(() => `nav-btn ${!FS.canGoForward() ? "disabled" : ""}`)}
          tooltipText="Go Forward (Alt+Right)"
          onClicked={() => FS.goForward()}
        >
          <label class="icon" label={Lucide["arrow-right"]} />
        </button>

        <button
          class={createComputed(() => `nav-btn ${!FS.canGoUp() ? "disabled" : ""}`)}
          tooltipText="Go Up (Alt+Up)"
          onClicked={() => FS.goUp()}
        >
          <label class="icon" label={Lucide["arrow-up"]} />
        </button>

        <button
          class={createComputed(() => `nav-btn ${FS.isLoading() ? "spinning" : ""}`)}
          tooltipText="Refresh (F5)"
          onClicked={() => FS.refresh()}
        >
          <label class="icon" label={Lucide["rotate-cw"]} />
        </button>
      </box>

      {/* 2. Interactive Breadcrumbs Path Bar */}
      <scrollable
        class="breadcrumbs-scrollable"
        hexpand={true}
        hscroll={Gtk.PolicyType.AUTOMATIC}
        vscroll={Gtk.PolicyType.NEVER}
      >
        <box
          class="breadcrumbs-box"
          spacing={4}
          valign={Gtk.Align.CENTER}
          $={(self) => {
            const render = () => {
              self.get_children().forEach((ch) => ch.destroy())
              const crumbs = FS.breadcrumbs()

              crumbs.forEach((crumb, index) => {
                const isLast = index === crumbs.length - 1
                const btn = (
                  <button
                    class={`crumb-btn ${isLast ? "current" : ""}`}
                    onClicked={() => FS.navigateTo(crumb.path)}
                  >
                    <label label={crumb.name} />
                  </button>
                )
                self.add(btn)

                if (!isLast) {
                  self.add(<label class="crumb-separator icon" label={Lucide["chevron-right"]} />)
                }
              })
              self.show_all()
            }

            render()
            FS.currentPath.subscribe(render)
          }}
        />
      </scrollable>

      {/* 3. Search Filter Bar */}
      <box class="search-box" spacing={6} valign={Gtk.Align.CENTER}>
        <label class="search-icon icon" label={Lucide["search"]} />
        <entry
          class="search-entry"
          placeholderText="Search files..."
          text={FS.searchQuery}
          onChanged={(self) => FS.setSearchQuery(self.get_text())}
        />
        {createComputed(() =>
          FS.searchQuery() ? (
            <button class="search-clear-btn" onClicked={() => FS.setSearchQuery("")}>
              <label class="icon" label={Lucide["x"]} />
            </button>
          ) : null
        )}
      </box>

      {/* 4. Action Buttons (View Mode, Hidden Files, Terminal) */}
      <box class="action-buttons-box" spacing={4} valign={Gtk.Align.CENTER}>
        {/* Toggle Grid/List */}
        <button
          class="action-btn"
          tooltipText="Toggle Grid / List View"
          onClicked={() => FS.toggleViewMode()}
        >
          <label
            class="icon"
            label={createComputed(() =>
              FS.viewMode() === "grid" ? Lucide["list"] : Lucide["grid"]
            )}
          />
        </button>

        {/* Toggle Hidden Files */}
        <button
          class={createComputed(() => `action-btn ${FS.showHidden() ? "active" : ""}`)}
          tooltipText="Toggle Hidden Files (Ctrl+H)"
          onClicked={() => FS.toggleHidden()}
        >
          <label
            class="icon"
            label={createComputed(() =>
              FS.showHidden() ? Lucide["eye"] : Lucide["eye-off"]
            )}
          />
        </button>

        {/* Open Terminal */}
        <button
          class="action-btn"
          tooltipText="Open Terminal in current directory"
          onClicked={() => FS.openTerminal(FS.currentPath())}
        >
          <label class="icon" label={Lucide["terminal"]} />
        </button>
      </box>
    </box>
  )
}
