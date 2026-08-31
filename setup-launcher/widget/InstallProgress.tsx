import { Gtk } from "ags/gtk3"
import { createRoot, createComputed } from "gnim"
import Installer from "../service/installer"
import { Lucide } from "../service/icons"

export default function InstallProgress() {
  return (
    <box class="InstallProgressView" orientation={Gtk.Orientation.VERTICAL} spacing={14} hexpand={true} vexpand={true}>
      {/* 1. Header Progress Status Card */}
      <box class="progress-status-card" orientation={Gtk.Orientation.VERTICAL} spacing={10}>
        <box spacing={12} valign={Gtk.Align.CENTER}>
          <box class="status-indicator-box" valign={Gtk.Align.CENTER}>
            <label
              class={createComputed(() => `icon status-icon ${Installer.isInstalling() ? "spinning" : "completed"}`)}
              label={createComputed(() =>
                Installer.isInstalling() ? Lucide["rotate-cw"] : Lucide["check"]
              )}
            />
          </box>

          <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand={true}>
            <label
              class="status-headline"
              label={createComputed(() =>
                Installer.isInstalling()
                  ? `Installing: ${Installer.currentPackage()?.name || "Initializing..."}`
                  : `Installation Finished (${Installer.successIds().length} Succeeded, ${Installer.failedIds().length} Failed)`
              )}
              xalign={0}
            />
            <label
              class="status-subheadline"
              label={createComputed(() =>
                Installer.isInstalling()
                  ? `Step ${Installer.completedCount() + 1} of ${Installer.totalSelectedCount()}`
                  : `All selected developer tools and environments have been processed.`
              )}
              xalign={0}
            />
          </box>

          {/* Progress Percentage */}
          <label
            class="progress-percent-label"
            label={createComputed(() => `${Installer.progressPercent()}%`)}
          />
        </box>

        {/* Linear Progress Bar */}
        <box
          class="custom-progress-container"
          hexpand={true}
          $={(self) => {
            const bar = new Gtk.ProgressBar({
              hexpand: true,
            })
            bar.get_style_context().add_class("setup-progressbar")
            self.add(bar)

            const update = () => {
              bar.set_fraction(Installer.progressPercent() / 100)
            }
            update()
            Installer.progressPercent.subscribe(update)
          }}
        />
      </box>

      {/* 2. Live Terminal Logs Output View */}
      <scrollable
        class="terminal-scrollable"
        hexpand={true}
        vexpand={true}
        hscroll={Gtk.PolicyType.AUTOMATIC}
        vscroll={Gtk.PolicyType.ALWAYS}
        $={(self) => {
          // Auto-scroll to bottom as logs stream in
          Installer.terminalLogs.subscribe(() => {
            const adj = self.get_vadjustment()
            if (adj) {
              setTimeout(() => adj.set_value(adj.get_upper() - adj.get_page_size()), 50)
            }
          })
        }}
      >
        <box
          class="terminal-log-box"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={2}
          $={(self) => {
            let disposeRoot: (() => void) | null = null

            const render = () => {
              if (disposeRoot) {
                disposeRoot()
                disposeRoot = null
              }
              self.get_children().forEach((ch) => ch.destroy())
              const logs = Installer.terminalLogs()

              createRoot((dispose) => {
                disposeRoot = dispose

                for (const line of logs) {
                  let lineClass = "log-line"
                  if (line.includes("✅") || line.includes("Successfully")) lineClass += " success"
                  else if (line.includes("❌") || line.includes("Failed")) lineClass += " error"
                  else if (line.includes("⚠️") || line.includes("warning")) lineClass += " warn"
                  else if (line.startsWith(">") || line.startsWith("⏳")) lineClass += " highlight"

                  const lbl = <label class={lineClass} label={line} xalign={0} wrap={true} />
                  self.add(lbl)
                }
              })
              self.show_all()
            }

            render()
            Installer.terminalLogs.subscribe(render)
          }}
        />
      </scrollable>

      {/* 3. Footer Back / Done Button */}
      <box class="progress-footer-bar" spacing={12} valign={Gtk.Align.CENTER}>
        <box hexpand={true} />

        <button
          class="done-btn"
          valign={Gtk.Align.CENTER}
          onClicked={() => Installer.setStep("catalog")}
        >
          <box spacing={8} valign={Gtk.Align.CENTER}>
            <label class="icon" label={Lucide["arrow-left"]} />
            <label
              class="btn-label"
              label={createComputed(() => (Installer.isInstalling() ? "View Catalog" : "Done & Return"))}
            />
          </box>
        </button>
      </box>
    </box>
  )
}
