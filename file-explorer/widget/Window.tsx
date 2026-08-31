import app from "ags/gtk3/app"
import { Gtk, Gdk } from "ags/gtk3"
import Header from "./Header"
import Sidebar from "./Sidebar"
import FileView from "./FileView"
import FS from "../service/fs"

export default function ExplorerWindow() {
  return (
    <window
      class="ExplorerWindow"
      name="file-explorer"
      title="Files"
      defaultWidth={920}
      defaultHeight={600}
      application={app}
      onKeyPressEvent={(_, event) => {
        const [, keyval] = event.get_keyval()
        const [, state] = event.get_state()
        const isCtrl = Boolean(state & Gdk.ModifierType.CONTROL_MASK)
        const isAlt = Boolean(state & Gdk.ModifierType.MOD1_MASK)

        // Escape: clear search
        if (keyval === Gdk.KEY_Escape) {
          if (FS.searchQuery()) {
            FS.setSearchQuery("")
            return true
          }
        }

        // Ctrl+H: toggle hidden files
        if (isCtrl && (keyval === Gdk.KEY_h || keyval === Gdk.KEY_H)) {
          FS.toggleHidden()
          return true
        }

        // Ctrl+R or F5: refresh
        if ((isCtrl && (keyval === Gdk.KEY_r || keyval === Gdk.KEY_R)) || keyval === Gdk.KEY_F5) {
          FS.refresh()
          return true
        }

        // Alt+Left: Back
        if (isAlt && keyval === Gdk.KEY_Left) {
          FS.goBack()
          return true
        }

        // Alt+Right: Forward
        if (isAlt && keyval === Gdk.KEY_Right) {
          FS.goForward()
          return true
        }

        // Alt+Up / Backspace: Go Up
        if ((isAlt && keyval === Gdk.KEY_Up) || keyval === Gdk.KEY_BackSpace) {
          FS.goUp()
          return true
        }

        return false
      }}
    >
      <box class="window-content-box" orientation={Gtk.Orientation.VERTICAL} spacing={0}>
        {/* 1. Header Navigation & Path Bar */}
        <Header />

        {/* 2. Constrained Resizable Body: Gtk.Paned with strict min/max limits */}
        <box
          class="paned-wrapper"
          orientation={Gtk.Orientation.HORIZONTAL}
          hexpand={true}
          vexpand={true}
          $={(self) => {
            const paned = new Gtk.Paned({
              orientation: Gtk.Orientation.HORIZONTAL,
              position: 200,
              hexpand: true,
              vexpand: true,
            })
            paned.get_style_context().add_class("resizable-paned")

            // Restrict sidebar resize boundary: Min 140px, Max 320px
            paned.connect("notify::position", () => {
              const pos = paned.get_position()
              if (pos < 140) {
                paned.set_position(140)
              } else if (pos > 320) {
                paned.set_position(320)
              }
            })

            const sidebarWidget = Sidebar()
            sidebarWidget.set_size_request(140, -1)

            const fileViewWidget = FileView()
            fileViewWidget.set_size_request(380, -1)

            paned.pack1(sidebarWidget, false, false)
            paned.pack2(fileViewWidget, true, false)

            self.add(paned)
            self.show_all()
          }}
        />

        {/* 3. Footer Status Bar */}
        <box class="StatusBar" spacing={12} valign={Gtk.Align.CENTER}>
          <label class="status-items-count" label={FS.itemCountStr} xalign={0} />
          <label class="status-feedback" label={FS.statusText} hexpand={true} xalign={0} />
          <label class="status-path" label={FS.currentPath} ellipsize={3} maxWidthChars={45} xalign={1} />
        </box>
      </box>
    </window>
  )
}
