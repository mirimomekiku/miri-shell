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

        {/* 2. Resizable Main Body: Gtk.Paned allows user to drag & resize sidebar */}
        <paned
          class="resizable-paned"
          orientation={Gtk.Orientation.HORIZONTAL}
          position={200}
          hexpand={true}
          vexpand={true}
        >
          <Sidebar />
          <FileView />
        </paned>

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
