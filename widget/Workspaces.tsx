import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Hyprland from "../service/hyprland"

export default function Workspaces() {
  const wsList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  return (
    <box class="Workspaces" spacing={4}>
      {wsList.map((id) => {
        const className = createComputed(() => {
          const focused = Hyprland.focusedWorkspace() === id
          const occupied = Hyprland.occupiedWorkspaces().includes(id)
          return `workspace-btn ${focused ? "focused" : ""} ${occupied ? "occupied" : "empty"}`.trim()
        })

        return (
          <button
            class={className}
            valign={Gtk.Align.CENTER}
            onClicked={() => Hyprland.changeWorkspace(id)}
          >
            <label label={String(id)} />
          </button>
        )
      })}
    </box>
  )
}
