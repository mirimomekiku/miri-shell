import app from "ags/gtk3/app"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio?version=2.0"
import style from "./style.scss"
import ExplorerWindow from "./widget/Window"
import FS from "./service/fs"

app.start({
  css: style,
  main(args) {
    if (args && args.length > 0 && args[0]) {
      let target = args[0]
      if (target.startsWith("file://")) {
        target = target.replace("file://", "")
      }
      if (!target.startsWith("/")) {
        target = GLib.canonicalize_filename(target, GLib.get_current_dir())
      }
      if (Gio.File.new_for_path(target).query_exists(null)) {
        FS.loadDirectory(target)
      }
    }
    ExplorerWindow()
  },
})
