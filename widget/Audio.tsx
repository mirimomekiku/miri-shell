import { Gtk, Gdk } from "ags/gtk3"
import Audio from "../service/audio"

export default function AudioWidget() {
  return (
    <button
      class="Audio"
      valign={Gtk.Align.CENTER}
      onClicked={() => Audio.toggleMute()}
      onScroll={(_, event) => {
        const direction = event.direction
        if (direction === Gdk.ScrollDirection.UP) {
          Audio.setVolume(Math.min(100, Audio.volume() + 5))
        } else if (direction === Gdk.ScrollDirection.DOWN) {
          Audio.setVolume(Math.max(0, Audio.volume() - 5))
        }
      }}
    >
      <box spacing={6} valign={Gtk.Align.CENTER}>
        <label class="icon" label={Audio.icon} />
        <label class="text" label={Audio.percentageText} />
      </box>
    </button>
  )
}
