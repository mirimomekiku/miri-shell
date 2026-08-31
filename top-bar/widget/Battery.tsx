import { Gtk } from "ags/gtk3"
import Battery from "../service/battery"

export default function BatteryWidget() {
  return (
    <box class="Battery" spacing={6} valign={Gtk.Align.CENTER}>
      <label class="icon" label={Battery.icon} />
      <label class="text" label={Battery.percentageText} />
    </box>
  )
}
