import { Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import FS, { FileItem } from "../service/fs"
import { Lucide } from "../service/icons"

export default function FileView() {
  const showContextMenu = (event: Gdk.Event, item: FileItem) => {
    const menu = new Gtk.Menu()

    // 1. Open
    const openItem = new Gtk.MenuItem({ label: item.isDir ? "Open Folder" : "Open File" })
    openItem.connect("activate", () => FS.openItem(item))
    menu.append(openItem)

    // 2. Open Terminal Here
    const termItem = new Gtk.MenuItem({ label: "Open in Terminal" })
    termItem.connect("activate", () => FS.openTerminal(item.path))
    menu.append(termItem)

    menu.append(new Gtk.SeparatorMenuItem())

    // 3. Copy Path
    const copyItem = new Gtk.MenuItem({ label: "Copy Full Path" })
    copyItem.connect("activate", () => FS.copyPath(item.path))
    menu.append(copyItem)

    menu.append(new Gtk.SeparatorMenuItem())

    // 4. Move to Trash
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
          const render = () => {
            self.get_children().forEach((ch) => ch.destroy())
            const items = FS.filteredItems()
            const isGrid = FS.viewMode() === "grid"

            if (items.length === 0) {
              const empty = (
                <box class="empty-state-box" orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                  <label class="empty-icon icon" label={Lucide["folder-open"]} />
                  <label class="empty-title" label={FS.searchQuery() ? "No matching files found" : "This folder is empty"} />
                  <label class="empty-sub" label={FS.searchQuery() ? `No files matching "${FS.searchQuery()}"` : "Drop files here or create a new folder"} />
                </box>
              )
              self.add(empty)
            } else if (isGrid) {
              // --- GRID VIEW ---
              const flowBox = new Gtk.FlowBox({
                valign: Gtk.Align.START,
                maxChildrenPerLine: 20,
                minChildrenPerLine: 3,
                selectionMode: Gtk.SelectionMode.NONE,
                homogeneous: true,
                columnSpacing: 10,
                rowSpacing: 10,
              })
              flowBox.get_style_context().add_class("file-grid-flowbox")

              for (const item of items) {
                const isSelected = FS.selectedPath() === item.path

                const cardBtn = (
                  <button
                    class={`grid-file-card ${item.isDir ? "is-folder" : "is-file"} ${isSelected ? "selected" : ""}`}
                    onClicked={() => {
                      FS.setSelectedPath(item.path)
                    }}
                    onButtonPressEvent={(_, event) => {
                      const [, button] = event.get_button()
                      const eventType = event.get_event_type()

                      // Double-click to open
                      if (eventType === Gdk.EventType._2BUTTON_PRESS && button === 1) {
                        FS.openItem(item)
                        return true
                      }

                      // Right-click for context menu
                      if (button === 3) {
                        FS.setSelectedPath(item.path)
                        showContextMenu(event, item)
                        return true
                      }
                      return false
                    }}
                  >
                    <box orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                      <label class={`grid-icon icon ${item.isDir ? "folder-icon" : "file-icon"}`} label={item.icon} />
                      <label
                        class="grid-name"
                        label={item.name}
                        wrap={true}
                        justify={Gtk.Justification.CENTER}
                        ellipsize={3}
                        maxWidthChars={14}
                      />
                      <label class="grid-sub" label={item.sizeStr} />
                    </box>
                  </button>
                )

                flowBox.add(cardBtn)
              }

              self.add(flowBox)
            } else {
              // --- LIST VIEW ---
              const listBox = (
                <box class="file-list-container" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                  {/* List Header */}
                  <box class="list-header-row" spacing={12} valign={Gtk.Align.CENTER}>
                    <label class="header-col-name" label="Name" hexpand={true} xalign={0} />
                    <label class="header-col-size" label="Size" xalign={1} />
                    <label class="header-col-date" label="Date Modified" xalign={1} />
                  </box>

                  {items.map((item) => {
                    const isSelected = FS.selectedPath() === item.path

                    return (
                      <button
                        class={`list-file-row ${item.isDir ? "is-folder" : "is-file"} ${isSelected ? "selected" : ""}`}
                        onClicked={() => FS.setSelectedPath(item.path)}
                        onButtonPressEvent={(_, event) => {
                          const [, button] = event.get_button()
                          const eventType = event.get_event_type()

                          if (eventType === Gdk.EventType._2BUTTON_PRESS && button === 1) {
                            FS.openItem(item)
                            return true
                          }

                          if (button === 3) {
                            FS.setSelectedPath(item.path)
                            showContextMenu(event, item)
                            return true
                          }
                          return false
                        }}
                      >
                        <box spacing={12} valign={Gtk.Align.CENTER}>
                          <label class={`list-icon icon ${item.isDir ? "folder-icon" : "file-icon"}`} label={item.icon} />
                          <label class="list-name" label={item.name} xalign={0} hexpand={true} ellipsize={3} />
                          <label class="list-size" label={item.sizeStr} xalign={1} />
                          <label class="list-date" label={item.dateStr} xalign={1} />
                        </box>
                      </button>
                    )
                  })}
                </box>
              )

              self.add(listBox)
            }

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
