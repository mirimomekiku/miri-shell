import { Gtk } from "ags/gtk3"
import { createRoot, createComputed } from "gnim"
import Installer, { PRESET_PROFILES } from "../service/installer"
import { CATEGORIES, PACKAGE_CATALOG } from "../service/catalog"
import { Lucide } from "../service/icons"

export default function PackageList() {
  return (
    <box class="PackageListView" orientation={Gtk.Orientation.VERTICAL} spacing={12} hexpand={true} vexpand={true}>
      {/* 1. Header Toolbar: Search + Preset Selectors */}
      <box class="toolbar-box" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <box spacing={12} valign={Gtk.Align.CENTER}>
          {/* Search Box */}
          <box class="search-box" spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
            <label class="search-icon icon" label={Lucide["search"]} />
            <entry
              class="search-entry"
              placeholderText="Filter developer tools, runtimes, IDEs, or tags (e.g. docker, python, react)..."
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
              <box spacing={4} valign={Gtk.Align.CENTER}>
                <label class="icon" label={Lucide["check"]} />
                <label label="Select All" />
              </box>
            </button>
            <button class="batch-btn deselect-all" onClicked={() => Installer.deselectAll()}>
              <box spacing={4} valign={Gtk.Align.CENTER}>
                <label class="icon" label={Lucide["x"]} />
                <label label="Deselect All" />
              </box>
            </button>
          </box>
        </box>

        {/* Preset Profiles Quick Bar */}
        <box class="presets-row" spacing={8} valign={Gtk.Align.CENTER}>
          <label class="presets-label" label="Presets:" />
          {PRESET_PROFILES.map((preset) => (
            <button
              class="preset-chip-btn"
              tooltipText={preset.description}
              onClicked={() => Installer.applyPreset(preset.id)}
            >
              <box spacing={6} valign={Gtk.Align.CENTER}>
                <label class="icon preset-icon" label={Lucide[preset.icon] || Lucide["sparkles"]} />
                <label class="preset-name" label={preset.name} />
              </box>
            </button>
          ))}
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
              const count = cat.id === "all"
                ? PACKAGE_CATALOG.length
                : PACKAGE_CATALOG.filter((p) => p.category === cat.id).length

              return (
                <button
                  class={createComputed(() => `category-pill ${isActive() ? "active" : ""}`)}
                  onClicked={() => Installer.setActiveCategory(cat.id)}
                >
                  <box spacing={6} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
                    <label class="icon cat-icon" label={cat.icon} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} xalign={0.5} yalign={0.5} />
                    <label class="cat-label" label={cat.label} valign={Gtk.Align.CENTER} />
                    <label class="cat-count-badge" label={String(count)} valign={Gtk.Align.CENTER} />
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
                      <label class="empty-icon icon" label={Lucide["search"]} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} xalign={0.5} yalign={0.5} />
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
                            {isSelected ? (
                              <label
                                class="icon check-icon"
                                label={Lucide["check"]}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                                xalign={0.5}
                                yalign={0.5}
                              />
                            ) : null}
                          </box>

                          {/* Tool Icon */}
                          <box
                            class={`pkg-icon-box cat-${pkg.category}`}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.CENTER}
                          >
                            <label
                              class={`icon tool-icon cat-${pkg.category}`}
                              label={pkg.icon}
                              halign={Gtk.Align.CENTER}
                              valign={Gtk.Align.CENTER}
                              xalign={0.5}
                              yalign={0.5}
                            />
                          </box>

                          {/* Package Info */}
                          <box orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand={true}>
                            <box spacing={8} valign={Gtk.Align.CENTER}>
                              <label class="pkg-title" label={pkg.name} xalign={0} />
                              <label class="pkg-category-badge" label={pkg.categoryLabel} />
                              {isInstalled ? (
                                <box class="installed-badge" spacing={4} valign={Gtk.Align.CENTER}>
                                  <label class="icon" label={Lucide["check"]} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} xalign={0.5} yalign={0.5} />
                                  <label class="badge-text" label="Installed" />
                                </box>
                              ) : null}
                            </box>
                            <label class="pkg-desc" label={pkg.description} xalign={0} wrap={true} />

                            {/* Tags Chips */}
                            <box class="tags-row" spacing={6} valign={Gtk.Align.CENTER}>
                              {pkg.tags.slice(0, 4).map((tag) => (
                                <label class="tag-chip" label={`#${tag}`} />
                              ))}
                            </box>
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
      <box class="bottom-action-bar" spacing={14} valign={Gtk.Align.CENTER}>
        <box spacing={8} hexpand={true} valign={Gtk.Align.CENTER}>
          <label class="selection-summary" label={createComputed(() => `${Installer.selectedCount()} tools selected for installation`)} />
          <label
            class="status-toast"
            label={Installer.statusToast}
            visible={createComputed(() => Boolean(Installer.statusToast()))}
          />
        </box>

        <button
          class={createComputed(() => `install-now-btn ${Installer.selectedCount() === 0 ? "disabled" : ""}`)}
          valign={Gtk.Align.CENTER}
          onClicked={() => Installer.startInstallation()}
        >
          <box spacing={8} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Lucide["download"]} />
            <label class="btn-label" label={createComputed(() => `Install ${Installer.selectedCount()} Selected Tools`)} />
          </box>
        </button>
      </box>
    </box>
  )
}
