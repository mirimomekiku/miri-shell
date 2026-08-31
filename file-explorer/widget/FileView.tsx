import { Gtk, Gdk } from "ags/gtk3"
import { createRoot } from "gnim"
import FS, { FileItem } from "../service/fs"
import { Lucide } from "../service/icons"

export default function FileView() {
  const showContextMenu = (event: Gdk.Event, item: FileItem) => {
    const menu = new Gtk.Menu()

    // 1. Primary Open
    const openItem = new Gtk.MenuItem({ label: item.isDir ? "Open Folder" : "Open File" })
    openItem.connect("activate", () => FS.openItem(item))
    menu.append(openItem)

    menu.append(new Gtk.SeparatorMenuItem())

    // 2. Developer Tools: Open with Antigravity IDE
    const agyItem = new Gtk.MenuItem({ label: "Open with Antigravity IDE" })
    agyItem.connect("activate", () => FS.openWithAntigravity(item.path))
    menu.append(agyItem)

    // 3. Developer Tools: Open with VS Code
    const codeItem = new Gtk.MenuItem({ label: "Open with VS Code" })
    codeItem.connect("activate", () => FS.openWithVSCode(item.path))
    menu.append(codeItem)

    // 4. Developer Tools: Open in Terminal
    const termItem = new Gtk.MenuItem({ label: "Open in Terminal" })
    termItem.connect("activate", () => FS.openInTerminal(item.path))
    menu.append(termItem)

    // 5. Developer Tools: Git / LazyGit (for folders or code repos)
    if (item.isDir) {
      const gitItem = new Gtk.MenuItem({ label: "Open in LazyGit" })
      gitItem.connect("activate", () => FS.openLazyGit(item.path))
      menu.append(gitItem)
    }

    menu.append(new Gtk.SeparatorMenuItem())

    // 6. Pin / Unpin from Sidebar (for folders)
    if (item.isDir) {
      const isPinned = FS.isPinned(item.path)
      const pinItem = new Gtk.MenuItem({
        label: isPinned ? "Unpin from Sidebar" : "Pin to Sidebar",
      })
      pinItem.connect("activate", () => FS.togglePin(item.path))
      menu.append(pinItem)
      menu.append(new Gtk.SeparatorMenuItem())
    }

    // 7. Copy Path
    const copyItem = new Gtk.MenuItem({ label: "Copy Full Path" })
    copyItem.connect("activate", () => FS.copyPath(item.path))
    menu.append(copyItem)

    menu.append(new Gtk.SeparatorMenuItem())

    // 8. Move to Trash
    const trashItem = new Gtk.MenuItem({ label: "Move to Trash" })
    trashItem.connect("activate", () => FS.moveToTrash(item.path))
    menu.append(trashItem)

    menu.show_all()
    menu.popup_at_pointer(event)
  }

  return (
    <scrollable
      class="FileViewScrollable"
      hexpand={true}
      vexpand={true}
      hscroll={Gtk.PolicyType.AUTOMATIC}
      vscroll={Gtk.PolicyType.AUTOMATIC}
    >
      <box
        class="file-view-container"
        orientation={Gtk.Orientation.VERTICAL}
        $={(self) => {
          let disposeRoot: (() => void) | null = null
          let lastClickTime = 0
          let lastClickPath = ""

          const handleItemClick = (item: FileItem) => {
            const now = Date.now()
            if (lastClickPath === item.path && now - lastClickTime < 450) {
              // Confirmed Double-Click: Open file / Enter directory
              lastClickTime = 0
              lastClickPath = ""
              FS.openItem(item)
            } else {
              // Single-Click: Select item
              lastClickTime = now
              lastClickPath = item.path
              FS.setSelectedPath(item.path)
            }
          }

          const render = () => {
            if (disposeRoot) {
              disposeRoot()
              disposeRoot = null
            }
            self.get_children().forEach((ch) => ch.destroy())
            const items = FS.filteredItems()
            const isGrid = FS.viewMode() === "grid"

            createRoot((dispose) => {
              disposeRoot = dispose

              if (items.length === 0) {
                const empty = (
                  <box
                    class="empty-state-box"
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={8}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                  >
                    <label class="empty-icon icon" label={Lucide["folder-open"]} />
                    <label
                      class="empty-title"
                      label={FS.searchQuery() ? "No matching files found" : "This folder is empty"}
                    />
                    <label
                      class="empty-sub"
                      label={
                        FS.searchQuery()
                          ? `No files matching "${FS.searchQuery()}"`
                          : "Folder contains no files"
                      }
                    />
                  </box>
                )
                self.add(empty)
              } else if (isGrid) {
                // --- GRID VIEW ---
                const flowBox = new Gtk.FlowBox({
                  valign: Gtk.Align.START,
                  maxChildrenPerLine: 30,
                  minChildrenPerLine: 2,
                  selectionMode: Gtk.SelectionMode.NONE,
                  homogeneous: true,
                  columnSpacing: 12,
                  rowSpacing: 12,
                })
                flowBox.get_style_context().add_class("file-grid-flowbox")

                for (const item of items) {
                  const isSelected = FS.selectedPath() === item.path

                  const cardBtn = (
                    <button
                      class={`grid-file-card ${item.isDir ? "is-folder" : "is-file"} type-${item.category} ${isSelected ? "selected" : ""}`}
                      onClicked={() => handleItemClick(item)}
                      onButtonPressEvent={(_, event) => {
                        const [, button] = event.get_button()
                        if (button === 3) {
                          FS.setSelectedPath(item.path)
                          showContextMenu(event, item)
                          return true
                        }
                        return false
                      }}
                    >
                      <box
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={6}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                      >
                        <label
                          class={`grid-icon icon type-${item.category}`}
                          label={item.icon}
                        />
                        <label
                          class="grid-name"
                          label={item.name}
                          wrap={true}
                          justify={Gtk.Justification.CENTER}
                          ellipsize={3}
                          maxWidthChars={14}
                        />
                        {/* Only display size for files, never for folders */}
                        {!item.isDir && Boolean(item.sizeStr) ? (
                          <label class="grid-sub" label={item.sizeStr} />
                        ) : null}
                      </box>
                    </button>
                  )

                  flowBox.add(cardBtn)
                }

                self.add(flowBox)
              } else {
                // --- LIST VIEW ---
                const listBox = new Gtk.Box({
                  orientation: Gtk.Orientation.VERTICAL,
                  spacing: 2,
                })
                listBox.get_style_context().add_class("file-list-container")

                // Header row
                const headerRow = (
                  <box class="list-header-row" spacing={12} valign={Gtk.Align.CENTER}>
                    <label class="header-col-name" label="Name" hexpand={true} xalign={0} />
                    <label class="header-col-size" label="Size" xalign={1} />
                    <label class="header-col-date" label="Date Modified" xalign={1} />
                  </box>
                )
                listBox.add(headerRow)

                // Items
                for (const item of items) {
                  const isSelected = FS.selectedPath() === item.path

                  const rowBtn = (
                    <button
                      class={`list-file-row ${item.isDir ? "is-folder" : "is-file"} type-${item.category} ${isSelected ? "selected" : ""}`}
                      onClicked={() => handleItemClick(item)}
                      onButtonPressEvent={(_, event) => {
                        const [, button] = event.get_button()
                        if (button === 3) {
                          FS.setSelectedPath(item.path)
                          showContextMenu(event, item)
                          return true
                        }
                        return false
                      }}
                    >
                      <box spacing={12} valign={Gtk.Align.CENTER}>
                        <label
                          class={`list-icon icon type-${item.category}`}
                          label={item.icon}
                        />
                        <label
                          class="list-name"
                          label={item.name}
                          xalign={0}
                          hexpand={true}
                          ellipsize={3}
                        />
                        {/* Only display size for files */}
                        <label class="list-size" label={item.isDir ? "" : item.sizeStr} xalign={1} />
                        <label class="list-date" label={item.dateStr} xalign={1} />
                      </box>
                    </button>
                  )
                  listBox.add(rowBtn)
                }

                self.add(listBox)
              }
            })
            self.show_all()
          }

          render()
          FS.filteredItems.subscribe(render)
          FS.viewMode.subscribe(render)
          FS.selectedPath.subscribe(render)
        }}
      />
    </scrollable>
  )
}
