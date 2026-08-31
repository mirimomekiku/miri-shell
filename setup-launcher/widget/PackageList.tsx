import { Gtk } from "ags/gtk3"
import { createRoot, createComputed } from "gnim"
import Installer from "../service/installer"
import { CATEGORIES } from "../service/catalog"
import { Lucide } from "../service/icons"

export default function PackageList() {
  return (
    <box class="PackageListView" orientation={Gtk.Orientation.VERTICAL} spacing={12} hexpand={true} vexpand={true}>
      {/* 1. Header Toolbar: Search + Category Filters */}
      <box class="toolbar-box" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <box spacing={12} valign={Gtk.Align.CENTER}>
          {/* Search Box */}
          <box class="search-box" spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
            <label class="search-icon icon" label={Lucide["search"]} />
            <entry
              class="search-entry"
              placeholderText="Filter developer tools, runtimes, IDEs, or tags..."
              text={Installer.searchQuery}
              onChanged={(self) => Installer.setSearchQuery(self.get_text())}
            />
            <button
              class="search-clear-btn"
              valign={Gtk.Align.CENTER}
              visible={createComputed(() => Boolean(Installer.searchQuery()))}
              onClicked={() => Installer.setSearchQuery("")}
            >
              <label class="icon" label={Lucide["x"]} />
            </button>
          </box>

          {/* Batch Selection Buttons */}
          <box class="batch-buttons" spacing={6} valign={Gtk.Align.CENTER}>
            <button class="batch-btn select-all" onClicked={() => Installer.selectAll()}>
              <label label="Select All" />
            </button>
            <button class="batch-btn deselect-all" onClicked={() => Installer.deselectAll()}>
              <label label="Deselect All" />
            </button>
          </box>
        </box>

        {/* Category Filter Pills (Scrollable) */}
        <scrollable
          class="categories-scrollable"
          hexpand={true}
          hscroll={Gtk.PolicyType.AUTOMATIC}
          vscroll={Gtk.PolicyType.NEVER}
        >
          <box class="categories-bar" spacing={6} valign={Gtk.Align.CENTER}>
            {CATEGORIES.map((cat) => {
              const isActive = createComputed(() => Installer.activeCategory() === cat.id)
              return (
                <button
                  class={createComputed(() => `category-pill ${isActive() ? "active" : ""}`)}
                  onClicked={() => Installer.setActiveCategory(cat.id)}
                >
                  <box spacing={6} valign={Gtk.Align.CENTER}>
                    <label class="icon cat-icon" label={cat.icon} />
                    <label class="cat-label" label={cat.label} />
                  </box>
                </button>
              )
            })}
          </box>
        </scrollable>
      </box>

      {/* 2. Package Cards Grid (Scrollable) */}
      <scrollable
        class="packages-scrollable"
        hexpand={true}
        vexpand={true}
        hscroll={Gtk.PolicyType.NEVER}
        vscroll={Gtk.PolicyType.AUTOMATIC}
      >
        <box
          class="packages-container"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={8}
          $={(self) => {
            let disposeRoot: (() => void) | null = null

            const render = () => {
              if (disposeRoot) {
                disposeRoot()
                disposeRoot = null
              }
              self.get_children().forEach((ch) => ch.destroy())
              const pkgs = Installer.filteredPackages()

              createRoot((dispose) => {
                disposeRoot = dispose

                if (pkgs.length === 0) {
                  const empty = (
                    <box
                      class="empty-pkgs-box"
                      orientation={Gtk.Orientation.VERTICAL}
                      spacing={8}
                      halign={Gtk.Align.CENTER}
                      valign={Gtk.Align.CENTER}
                    >
                      <label class="empty-icon icon" label={Lucide["search"]} />
                      <label class="empty-title" label="No matching tools found" />
                      <label class="empty-sub" label="Try changing your search query or category filter" />
                    </box>
                  )
                  self.add(empty)
                } else {
                  for (const pkg of pkgs) {
                    const isSelected = Installer.isSelected(pkg.id)
                    const isInstalled = Installer.isInstalled(pkg.id)

                    const cardBtn = (
                      <button
                        class={`pkg-card ${isSelected ? "selected" : ""} ${isInstalled ? "installed" : ""}`}
                        onClicked={() => Installer.togglePackage(pkg.id)}
                      >
                        <box spacing={14} valign={Gtk.Align.CENTER}>
                          {/* Checkbox Indicator */}
                          <box class={`pkg-checkbox ${isSelected ? "checked" : ""}`} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
                            {isSelected ? <label class="icon check-icon" label={Lucide["check"]} /> : null}
                          </box>

                          {/* Tool Icon */}
                          <box
                            class={`pkg-icon-box cat-${pkg.category}`}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.CENTER}
                          >
                            <label class={`icon tool-icon cat-${pkg.category}`} label={pkg.icon} />
                          </box>

                          {/* Package Info */}
                          <box orientation={Gtk.Orientation.VERTICAL} spacing={3} hexpand={true}>
                            <box spacing={8} valign={Gtk.Align.CENTER}>
                              <label class="pkg-title" label={pkg.name} xalign={0} />
                              <label class="pkg-category-badge" label={pkg.categoryLabel} />
                              {isInstalled ? (
                                <box class="installed-badge" spacing={4} valign={Gtk.Align.CENTER}>
                                  <label class="icon" label={Lucide["check"]} />
                                  <label class="badge-text" label="Installed" />
                                </box>
                              ) : null}
                            </box>
                            <label class="pkg-desc" label={pkg.description} xalign={0} wrap={true} />
                          </box>
                        </box>
                      </button>
                    )
                    self.add(cardBtn)
                  }
                }
              })
              self.show_all()
            }

            render()
            Installer.filteredPackages.subscribe(render)
            Installer.selectedIds.subscribe(render)
            Installer.installedIds.subscribe(render)
          }}
        />
      </scrollable>

      {/* 3. Bottom Action Bar */}
      <box class="bottom-action-bar" spacing={12} valign={Gtk.Align.CENTER}>
        <box spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
          <label class="selection-summary" label={createComputed(() => `${Installer.selectedCount()} tools selected for installation`)} />
        </box>

        <button
          class={createComputed(() => `install-now-btn ${Installer.selectedCount() === 0 ? "disabled" : ""}`)}
          valign={Gtk.Align.CENTER}
          onClicked={() => Installer.startInstallation()}
        >
          <box spacing={8} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Lucide["download"]} />
            <label class="btn-label" label="Install Selected Tools" />
          </box>
        </button>
      </box>
    </box>
  )
}
