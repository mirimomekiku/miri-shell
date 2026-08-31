import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Hyprland from "../service/hyprland"

export default function ActiveTitle() {
  const displayText = createComputed(() => {
    const title = Hyprland.focusedTitle()
    const cls = Hyprland.focusedClass()

    if (!title && !cls) {
      return "Desktop"
    }

    if (title.length > 50) {
      return title.slice(0, 47) + "..."
    }

    return title || cls
  })

  const iconName = createComputed(() => {
    const cls = Hyprland.focusedClass().toLowerCase()
    return cls || "video-display-symbolic"
  })

  return (
    <box class="ActiveTitle" spacing={8} valign={Gtk.Align.CENTER}>
      <label
        class="title-text"
        label={displayText}
        maxWidthChars={50}
        ellipsize={3} // PANGO_ELLIPSIZE_END
      />
    </box>
  )
}
