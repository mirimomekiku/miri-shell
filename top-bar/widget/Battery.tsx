import { Gtk } from "ags/gtk3"
import Battery from "../service/battery"
import ControlCenter from "../service/controlcenter"

export default function BatteryWidget() {
  return (
    <button
      class="Battery"
      valign={Gtk.Align.CENTER}
      tooltipText={Battery.tooltipText}
      onClicked={() => ControlCenter.toggleOpen()}
    >
      <box spacing={6} valign={Gtk.Align.CENTER}>
        <label class="icon" label={Battery.icon} />
        <label class="text" label={Battery.percentageText} />
      </box>
    </button>
  )
}
