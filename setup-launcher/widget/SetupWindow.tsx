import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import Installer from "../service/installer"
import PackageList from "./PackageList"
import InstallProgress from "./InstallProgress"
import { Lucide } from "../service/icons"

export default function SetupWindow() {
  return (
    <window
      class="SetupWindow"
      name="setup-launcher"
      title="Miri Developer Setup"
      application={app}
      defaultWidth={980}
      defaultHeight={680}
      onKeyPressEvent={(_, event) => {
        const [, keyval] = event.get_keyval()
        const [, state] = event.get_state()
        const isCtrl = Boolean(state & Gdk.ModifierType.CONTROL_MASK)

        // Escape or Ctrl+Q: Close setup window
        if (keyval === Gdk.KEY_Escape || (isCtrl && keyval === Gdk.KEY_q)) {
          if (!Installer.isInstalling()) {
            app.quit()
            return true
          }
        }

        // Ctrl+A: Select All (in catalog mode)
        if (isCtrl && keyval === Gdk.KEY_a && Installer.step() === "catalog") {
          Installer.selectAll()
          return true
        }

        // Ctrl+D: Deselect All
        if (isCtrl && keyval === Gdk.KEY_d && Installer.step() === "catalog") {
          Installer.deselectAll()
          return true
        }

        return false
      }}
    >
      <box class="SetupContainer" orientation={Gtk.Orientation.VERTICAL} spacing={0} hexpand={true} vexpand={true}>
        {/* Top App Header */}
        <box class="setup-header" spacing={12} valign={Gtk.Align.CENTER}>
          <box class="app-logo-badge" valign={Gtk.Align.CENTER}>
            <label class="icon" label={Lucide["sparkles"]} />
          </box>

          <box orientation={Gtk.Orientation.VERTICAL} spacing={1} hexpand={true}>
            <label class="setup-main-title" label="Miri Developer Environment Setup" xalign={0} />
            <label class="setup-sub-title" label="Install runtimes, IDEs, AI agents, mobile tools, and shell utilities for Fedora" xalign={0} />
          </box>

          {/* Close Window Button */}
          <button
            class="header-close-btn"
            valign={Gtk.Align.CENTER}
            onClicked={() => app.quit()}
          >
            <label class="icon" label={Lucide["x"]} />
          </button>
        </box>

        {/* Dynamic Body: Catalog View vs Install Progress View */}
        <box class="setup-body" hexpand={true} vexpand={true}>
          <box
            class="view-switcher"
            hexpand={true}
            vexpand={true}
            visible={createComputed(() => Installer.step() === "catalog")}
          >
            <PackageList />
          </box>

          <box
            class="view-switcher"
            hexpand={true}
            vexpand={true}
            visible={createComputed(() => Installer.step() !== "catalog")}
          >
            <InstallProgress />
          </box>
        </box>
      </box>
    </window>
  )
}
