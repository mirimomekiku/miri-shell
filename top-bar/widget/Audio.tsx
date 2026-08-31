import { Gtk, Gdk } from "ags/gtk3"
import Audio from "../service/audio"
import Media from "../service/media"
import ControlCenter from "../service/controlcenter"

export default function AudioWidget() {
  return (
    <button
      class="Audio"
      valign={Gtk.Align.CENTER}
      onClicked={() => {
        ControlCenter.setOpen(false)
        Media.toggleOpen()
      }}
      onScrollEvent={(_, event) => {
        const [, dir] = event.get_scroll_direction()
        if (dir === Gdk.ScrollDirection.UP) {
          Audio.setVolume(Math.min(100, Audio.volume() + 5))
        } else if (dir === Gdk.ScrollDirection.DOWN) {
          Audio.setVolume(Math.max(0, Audio.volume() - 5))
        }
        return false
      }}
    >
      <box spacing={6} valign={Gtk.Align.CENTER}>
        <label class="icon" label={Audio.icon} />
        <label class="text" label={Audio.percentageText} />
      </box>
    </button>
  )
}
