import { Gtk } from "ags/gtk3"
import { createPoll } from "ags/time"

export default function Clock() {
  const time = createPoll("", 1000, "date '+%H:%M'")

  return (
    <box class="Clock" valign={Gtk.Align.CENTER}>
      <label class="time-label" label={time} />
    </box>
  )
}
