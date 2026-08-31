import { Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import Hyprland from "../service/hyprland"

export default function Workspaces() {
  const wsList = [1, 2, 3, 4, 5]

  return (
    <box
      class="Workspaces"
      spacing={6}
      valign={Gtk.Align.CENTER}
      onScrollEvent={(_, event) => {
        const [, dir] = event.get_scroll_direction()
        const cur = Hyprland.focusedWorkspace()
        if (dir === Gdk.ScrollDirection.UP) {
          Hyprland.changeWorkspace(Math.max(1, cur - 1))
        } else if (dir === Gdk.ScrollDirection.DOWN) {
          Hyprland.changeWorkspace(Math.min(5, cur + 1))
        }
        return false
      }}
    >
      {wsList.map((id) => {
        const className = createComputed(() => {
          const focused = Hyprland.focusedWorkspace() === id
          const occupied = Hyprland.occupiedWorkspaces().includes(id)
          return `ws-item ${focused ? "focused" : ""} ${occupied ? "occupied" : "empty"}`.trim()
        })

        return (
          <button
            class={className}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            onClicked={() => Hyprland.changeWorkspace(id)}
          >
            <label label={String(id)} />
          </button>
        )
      })}
    </box>
  )
}
