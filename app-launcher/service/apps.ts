import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import { evaluateMath } from "./calc"
import { Lucide } from "./icons"

export interface LauncherItem {
  id: string
  type: "app" | "calc" | "cmd" | "web"
  name: string
  subtitle: string
  iconName?: string
  lucideIcon?: string
  appInfo?: Gio.AppInfo
  command?: string
  calcResult?: string
}

class AppService {
  private _query = createState<string>("")
  private _selectedIndex = createState<number>(0)
  private _apps = createState<LauncherItem[]>([])
  private _frequency = createState<Record<string, number>>({})

  public readonly query = this._query[0]
  public readonly selectedIndex = this._selectedIndex[0]
  public readonly apps = this._apps[0]

  constructor() {
    this.loadFrequency()
    this.refreshApps()
  }

  private getFrequencyPath(): string {
    return `${GLib.get_user_config_dir()}/miri-shell/app-frequency.json`
  }

  private loadFrequency() {
    try {
      const file = Gio.File.new_for_path(this.getFrequencyPath())
      if (file.query_exists(null)) {
        const [, contents] = file.load_contents(null)
        const text = new TextDecoder().decode(contents)
        this._frequency[1](JSON.parse(text) || {})
      }
    } catch {
      // ignore
    }
  }

  private saveFrequency() {
    try {
      const dir = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/miri-shell`)
      if (!dir.query_exists(null)) {
        dir.make_directory_with_parents(null)
      }
      const file = Gio.File.new_for_path(this.getFrequencyPath())
      file.replace_contents(
        JSON.stringify(this._frequency[0](), null, 2),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      )
    } catch {
      // ignore
    }
  }

  public refreshApps() {
    const rawApps = Gio.AppInfo.get_all()
    const items: LauncherItem[] = []
    const freq = this._frequency[0]()

    for (const app of rawApps) {
      if (!app.should_show()) continue

      const id = app.get_id() || app.get_executable() || app.get_name()
      const name = app.get_name()
      const description = app.get_description() || app.get_executable() || "Application"
      const iconName = app.get_icon()?.to_string() || "application-x-executable"

      items.push({
        id,
        type: "app",
        name,
        subtitle: description,
        iconName,
        appInfo: app,
      })
    }

    // Sort by frequency (most used first), then alphabetical
    items.sort((a, b) => {
      const countA = freq[a.id] || 0
      const countB = freq[b.id] || 0
      if (countA !== countB) return countB - countA
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })

    this._apps[1](items)
  }

  public readonly results = createComputed<LauncherItem[]>(() => {
    const q = this.query().trim()
    const qLower = q.toLowerCase()

    if (!q) {
      // Show top 8 frequently used / default apps
      return this.apps().slice(0, 8)
    }

    // 1. Math Calculation Mode (e.g. `25 * 4`, `= 500 / 2`, `sqrt(144)`)
    const math = evaluateMath(q)
    if (math.isMath) {
      return [
        {
          id: "calc-result",
          type: "calc",
          name: math.result,
          subtitle: `${math.expression} = ${math.result} (Press Enter to copy to clipboard)`,
          lucideIcon: Lucide["copy"],
          calcResult: math.result,
        },
      ]
    }

    // 2. Terminal Command Execution Mode (`> htop` or `$ btop`)
    if (q.startsWith(">") || q.startsWith("$")) {
      const cmd = q.slice(1).trim()
      return [
        {
          id: "cmd-exec",
          type: "cmd",
          name: cmd ? `Run "${cmd}" in Terminal` : "Run in Terminal",
          subtitle: "Execute command line in default terminal",
          lucideIcon: Lucide["terminal"],
          command: cmd,
        },
      ]
    }

    // 3. Web Search Mode (`? query` or `g: query`)
    if (q.startsWith("?") || q.startsWith("g:")) {
      const searchTarget = q.replace(/^(\?|g:)/, "").trim()
      return [
        {
          id: "web-search",
          type: "web",
          name: `Search "${searchTarget}" on Google`,
          subtitle: "Open search in default web browser",
          lucideIcon: Lucide["search"],
          command: searchTarget,
        },
      ]
    }

    // 4. Fuzzy App Search
    const matched = this.apps().filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(qLower)
      const subMatch = item.subtitle.toLowerCase().includes(qLower)
      const exeMatch = item.appInfo?.get_executable()?.toLowerCase().includes(qLower)
      return nameMatch || subMatch || exeMatch
    })

    // Add fallback web search option if few or no results
    const list = matched.slice(0, 8)
    if (list.length === 0 && q.length > 1) {
      list.push({
        id: "fallback-web",
        type: "web",
        name: `Search "${q}" on Google`,
        subtitle: "No application matches found. Search the web.",
        lucideIcon: Lucide["search"],
        command: q,
      })
    }

    return list
  })

  public setQuery(q: string) {
    this._query[1](q)
    this._selectedIndex[1](0)
  }

  public selectNext() {
    const total = this.results().length
    if (total > 0) {
      const next = (this._selectedIndex[0]() + 1) % total
      this._selectedIndex[1](next)
    }
  }

  public selectPrev() {
    const total = this.results().length
    if (total > 0) {
      const current = this._selectedIndex[0]()
      const prev = current <= 0 ? total - 1 : current - 1
      this._selectedIndex[1](prev)
    }
  }

  public launchItem(item: LauncherItem) {
    if (!item) return

    if (item.type === "app" && item.appInfo) {
      // Record frequency
      const freq = { ...this._frequency[0]() }
      freq[item.id] = (freq[item.id] || 0) + 1
      this._frequency[1](freq)
      this.saveFrequency()

      // Launch application
      try {
        item.appInfo.launch([], null)
      } catch {
        const exe = item.appInfo.get_executable()
        if (exe) execAsync(exe).catch(() => {})
      }
    } else if (item.type === "calc" && item.calcResult) {
      execAsync(`wl-copy "${item.calcResult}"`).catch(() => {})
    } else if (item.type === "cmd" && item.command) {
      execAsync(`sh -c 'cd "$HOME" && (kitty -e sh -c "${item.command}; exec \$SHELL" || alacritty -e sh -c "${item.command}; exec \$SHELL" || foot sh -c "${item.command}; exec \$SHELL" || gnome-terminal -- sh -c "${item.command}; exec \$SHELL")'`).catch(() => {})
    } else if (item.type === "web" && item.command) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(item.command)}`
      execAsync(`xdg-open "${url}"`).catch(() => {})
    }

    // Exit launcher after launching
    execAsync("ags quit").catch(() => {})
  }

  public launchSelected() {
    const res = this.results()
    const idx = this.selectedIndex()
    if (res.length > 0 && idx >= 0 && idx < res.length) {
      this.launchItem(res[idx])
    }
  }
}

export const Apps = new AppService()
export default Apps
