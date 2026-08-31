import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
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

  return (
    <box class="Sidebar" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <label class="sidebar-heading" label="PLACES" xalign={0} />

      <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
        {places.map((place) => {
          const isActive = createComputed(() => FS.currentPath() === place.path)

          return (
            <button
              class={createComputed(() => `sidebar-item-btn ${isActive() ? "active" : ""}`)}
              onClicked={() => FS.navigateTo(place.path)}
            >
              <box spacing={10} valign={Gtk.Align.CENTER}>
                <label class="icon" label={place.icon} />
                <label class="name" label={place.name} xalign={0} hexpand={true} />
              </box>
            </button>
          )
        })}
      </box>
    </box>
  )
}
