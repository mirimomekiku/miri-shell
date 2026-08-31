import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import { PACKAGE_CATALOG, PackageDefinition, PackageCategory } from "./catalog"

class InstallerService {
  private _selectedIds = createState<string[]>(
    PACKAGE_CATALOG.filter((p) => p.defaultSelected).map((p) => p.id)
  )
  private _installedIds = createState<string[]>([])
  private _activeCategory = createState<PackageCategory | "all">("all")
  private _searchQuery = createState<string>("")

  // Installation execution state
  private _step = createState<"catalog" | "installing" | "completed">("catalog")
  private _isInstalling = createState<boolean>(false)
  private _currentPackageId = createState<string>("")
  private _terminalLogs = createState<string[]>([])
  private _completedCount = createState<number>(0)
  private _successIds = createState<string[]>([])
  private _failedIds = createState<string[]>([])

  public readonly selectedIds = this._selectedIds[0]
  public readonly installedIds = this._installedIds[0]
  public readonly activeCategory = this._activeCategory[0]
  public readonly searchQuery = this._searchQuery[0]

  public readonly step = this._step[0]
  public readonly isInstalling = this._isInstalling[0]
  public readonly currentPackageId = this._currentPackageId[0]
  public readonly terminalLogs = this._terminalLogs[0]
  public readonly completedCount = this._completedCount[0]
  public readonly successIds = this._successIds[0]
  public readonly failedIds = this._failedIds[0]

  public readonly filteredPackages = createComputed<PackageDefinition[]>(() => {
    const cat = this.activeCategory()
    const query = this.searchQuery().toLowerCase().trim()

    return PACKAGE_CATALOG.filter((pkg) => {
      const matchCat = cat === "all" || pkg.category === cat
      const matchQuery =
        !query ||
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query) ||
        pkg.tags.some((t) => t.toLowerCase().includes(query))
      return matchCat && matchQuery
    })
  })

  public readonly selectedCount = createComputed(() => this.selectedIds().length)
  public readonly totalSelectedCount = createComputed(() => this.selectedIds().length)

  public readonly progressPercent = createComputed(() => {
    const total = this.selectedIds().length
    if (total === 0) return 0
    return Math.min(100, Math.round((this.completedCount() / total) * 100))
  })

  public readonly currentPackage = createComputed(() => {
    const id = this.currentPackageId()
    return PACKAGE_CATALOG.find((p) => p.id === id) || null
  })

  constructor() {
    this.checkInstalledPackages()
  }

  public async checkInstalledPackages() {
    for (const pkg of PACKAGE_CATALOG) {
      try {
        await execAsync(`sh -c '${pkg.checkCmd}'`)
        if (!this._installedIds[0]().includes(pkg.id)) {
          this._installedIds[1]([...this._installedIds[0](), pkg.id])
        }
      } catch {
        // Not installed
      }
    }
  }

  public isSelected(id: string): boolean {
    return this.selectedIds().includes(id)
  }

  public isInstalled(id: string): boolean {
    return this.installedIds().includes(id)
  }

  public togglePackage(id: string) {
    if (this.isSelected(id)) {
      this._selectedIds[1](this.selectedIds().filter((i) => i !== id))
    } else {
      this._selectedIds[1]([...this.selectedIds(), id])
    }
  }

  public selectAll() {
    const visibleIds = this.filteredPackages().map((p) => p.id)
    const combined = Array.from(new Set([...this.selectedIds(), ...visibleIds]))
    this._selectedIds[1](combined)
  }

  public deselectAll() {
    const visibleIds = this.filteredPackages().map((p) => p.id)
    this._selectedIds[1](this.selectedIds().filter((id) => !visibleIds.includes(id)))
  }

  public setActiveCategory(cat: PackageCategory | "all") {
    this._activeCategory[1](cat)
  }

  public setSearchQuery(q: string) {
    this._searchQuery[1](q)
  }

  public setStep(step: "catalog" | "installing" | "completed") {
    this._step[1](step)
  }

  private appendLog(line: string) {
    const logs = [...this._terminalLogs[0](), line]
    // Keep last 1000 lines
    if (logs.length > 1000) logs.shift()
    this._terminalLogs[1](logs)
  }

  public async startInstallation() {
    const selected = PACKAGE_CATALOG.filter((p) => this.selectedIds().includes(p.id))
    if (selected.length === 0) return

    this._step[1]("installing")
    this._isInstalling[1](true)
    this._completedCount[1](0)
    this._successIds[1]([])
    this._failedIds[1]([])
    this._terminalLogs[1]([])

    this.appendLog(`=======================================================`)
    this.appendLog(`🚀 Starting Miri Developer Setup Installation`)
    this.appendLog(`📦 Selected Tools (${selected.length}): ${selected.map((p) => p.name).join(", ")}`)
    this.appendLog(`=======================================================\n`)

    for (const pkg of selected) {
      this._currentPackageId[1](pkg.id)
      this.appendLog(`\n⏳ [${this.completedCount() + 1}/${selected.length}] Installing ${pkg.name}...`)
      this.appendLog(`> ${pkg.installCmd}`)

      try {
        const proc = Gio.Subprocess.new(
          ["bash", "-c", pkg.installCmd],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        )

        const [stdout, stderr] = await new Promise<[string, string]>((resolve) => {
          proc.communicate_utf8_async(null, null, (_proc, res) => {
            try {
              const [, out, err] = proc.communicate_utf8_finish(res)
              resolve([out || "", err || ""])
            } catch (e: any) {
              resolve(["", e.message || "Execution error"])
            }
          })
        })

        if (stdout) {
          stdout.split("\n").filter(Boolean).forEach((l) => this.appendLog(`  ${l}`))
        }
        if (stderr) {
          stderr.split("\n").filter(Boolean).forEach((l) => this.appendLog(`  ⚠️ ${l}`))
        }

        if (proc.get_successful()) {
          this.appendLog(`✅ Successfully installed ${pkg.name}`)
          this._successIds[1]([...this._successIds[0](), pkg.id])
          if (!this._installedIds[0]().includes(pkg.id)) {
            this._installedIds[1]([...this._installedIds[0](), pkg.id])
          }
        } else {
          this.appendLog(`❌ Failed to install ${pkg.name} (Exit code: ${proc.get_exit_status()})`)
          this._failedIds[1]([...this._failedIds[0](), pkg.id])
        }
      } catch (err: any) {
        this.appendLog(`❌ Error executing ${pkg.name}: ${err.message}`)
        this._failedIds[1]([...this._failedIds[0](), pkg.id])
      }

      this._completedCount[1](this.completedCount() + 1)
    }

    this._isInstalling[1](false)
    this._currentPackageId[1]("")
    this._step[1]("completed")
    this.appendLog(`\n=======================================================`)
    this.appendLog(`🎉 Installation Complete! (${this.successIds().length} succeeded, ${this.failedIds().length} failed)`)
    this.appendLog(`=======================================================`)
  }
}

export const Installer = new InstallerService()
export default Installer
