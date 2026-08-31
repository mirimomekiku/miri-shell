import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"

app.start({
  main() {
    const win = new Astal.Window({
      application: app,
      child: new Gtk.Box(),
    })
    console.log("Astal window initialized successfully!")
    app.quit()
  }
})
