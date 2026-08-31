import { Gtk } from "ags/gtk3"
import { createPoll } from "ags/time"
import ControlCenter from "../service/controlcenter"
import Media from "../service/media"

export default function Clock() {
  const time = createPoll("", 1000, "date '+%H:%M'")
  const fullDate = createPoll("", 60000, "date '+%A, %B %d, %Y'")

  return (
    <button
      class="Clock"
      valign={Gtk.Align.CENTER}
      tooltipText={fullDate}
      onClicked={() => {
        Media.setOpen(false)
        ControlCenter.toggleOpen()
      }}
    >
      <label class="time-label" label={time} />
    </button>
  )
}
