import { Gtk } from "ags/gtk3"
import Network from "../service/network"

export default function NetworkWidget() {
  return (
    <box class="Network" spacing={6} valign={Gtk.Align.CENTER}>
      <label class="icon" label={Network.icon} />
      <label class="text" label={Network.ssid} />
    </box>
  )
}
