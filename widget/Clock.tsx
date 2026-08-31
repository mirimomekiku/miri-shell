import { Gtk } from "ags/gtk3"
import { createPoll } from "ags/time"
import ControlCenter from "../service/controlcenter"
import Media from "../service/media"

export default function Clock() {
  const time = createPoll("", 1000, "date '+%H:%M'")

  return (
    <button
      class="Clock"
      valign={Gtk.Align.CENTER}
      onClicked={() => {
        Media.setOpen(false)
        ControlCenter.toggleOpen()
      }}
    >
      <label class="time-label" label={time} />
    </button>
  )
}
