import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import { Lucide } from "./icons"

export type FileCategory =
  | "folder"
  | "code"
  | "doc"
  | "sheet"
  | "image"
  | "audio"
  | "video"
  | "archive"
  | "bin"
  | "generic"

export interface FileItem {
  name: string
  path: string
  isDir: boolean
  isSymlink: boolean
  isHidden: boolean
  sizeBytes: number
  sizeStr: string
  modifiedSec: number
  dateStr: string
  icon: string
  category: FileCategory
  extension: string
}

export interface PinnedFolder {
  name: string
  path: string
  icon: string
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileCategory(name: string, isDir: boolean): { icon: string; category: FileCategory } {
  if (isDir) {
    const lower = name.toLowerCase()
    if (lower === ".git") return { icon: Lucide["folder-git"], category: "folder" }
    if (["src", "service", "widget", "lib", "components"].includes(lower)) {
      return { icon: Lucide["folder-code"] || Lucide["folder"], category: "folder" }
    }
    if (["dist", "build", "out", "target"].includes(lower)) {
      return { icon: Lucide["folder-archive"] || Lucide["folder"], category: "folder" }
    }
    return { icon: Lucide["folder"], category: "folder" }
  }

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""

  // Spreadsheets & Tables
  if (["xls", "xlsx", "csv", "tsv", "ods", "numbers"].includes(ext)) {
    return { icon: Lucide["file-spreadsheet"] || Lucide["file-text"], category: "sheet" }
  }

  // Documents & Office (PDF, Word, Markdown, Text)
  if ([
    "pdf", "doc", "docx", "odt", "rtf", "pages",
    "ppt", "pptx", "odp", "key",
    "txt", "md", "markdown", "rst", "log", "tex", "epub"
  ].includes(ext)) {
    return { icon: Lucide["file-text"], category: "doc" }
  }

  // Code & Config
  if ([
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "c", "cpp", "h", "hpp",
    "java", "kt", "lua", "sh", "bash", "zsh", "fish", "json", "yaml", "yml",
    "toml", "xml", "html", "css", "scss", "sass", "vue", "svelte", "astro",
    "graphql", "sql", "php", "rb", "swift", "dart", "env", "lock"
  ].includes(ext)) {
    return { icon: Lucide["file-code"], category: "code" }
  }

  // Images
  if (["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp", "ico", "tiff", "avif", "psd"].includes(ext)) {
    return { icon: Lucide["image"], category: "image" }
  }

  // Audio
  if (["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus", "wma", "aiff", "mid"].includes(ext)) {
    return { icon: Lucide["music"], category: "audio" }
  }

  // Video
  if (["mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "m4v", "3gp", "ts"].includes(ext)) {
    return { icon: Lucide["video"], category: "video" }
  }

  // Archives
  if (["zip", "tar", "gz", "xz", "7z", "bz2", "rar", "iso", "tgz", "zst", "deb", "rpm", "apk"].includes(ext)) {
    return { icon: Lucide["archive"], category: "archive" }
  }

  // Executables & Binaries
  if (["bin", "appimage", "so", "dll", "exe", "out"].includes(ext)) {
    return { icon: Lucide["terminal"], category: "bin" }
  }

  return { icon: Lucide["file"], category: "generic" }
}

class FilesystemService {
  private _currentPath = createState<string>(GLib.get_home_dir())
  private _history = createState<string[]>([GLib.get_home_dir()])
  private _historyIndex = createState<number>(0)

  private _items = createState<FileItem[]>([])
  private _isLoading = createState<boolean>(false)
  private _showHidden = createState<boolean>(false)
  private _searchQuery = createState<string>("")
  private _viewMode = createState<"grid" | "list">("grid")
  private _selectedPath = createState<string>("")
  private _statusText = createState<string>("")

  // Pinned Folders & Collapse state
  private _pinned = createState<string[]>([])
  private _pinnedExpanded = createState<boolean>(true)

  public readonly currentPath = this._currentPath[0]
  public readonly items = this._items[0]
  public readonly isLoading = this._isLoading[0]
  public readonly showHidden = this._showHidden[0]
  public readonly searchQuery = this._searchQuery[0]
  public readonly viewMode = this._viewMode[0]
  public readonly selectedPath = this._selectedPath[0]
  public readonly statusText = this._statusText[0]

  public readonly pinned = this._pinned[0]
  public readonly pinnedExpanded = this._pinnedExpanded[0]

  public readonly canGoBack = createComputed(() => this._historyIndex[0]() > 0)
  public readonly canGoForward = createComputed(
    () => this._historyIndex[0]() < this._history[0]().length - 1
  )
  public readonly canGoUp = createComputed(() => {
    const p = this.currentPath()
    return p !== "/" && p.length > 1
  })

  public readonly homeDir = GLib.get_home_dir()

  public readonly pinnedList = createComputed<PinnedFolder[]>(() => {
    const list = this.pinned()
    return list.map((p) => {
      const parts = p.split("/").filter(Boolean)
      const name = parts.length > 0 ? parts[parts.length - 1] : "Root"
      return {
        name,
        path: p,
        icon: name === ".git" ? Lucide["folder-git"] : Lucide["folder"],
      }
    })
  })

  public readonly breadcrumbs = createComputed(() => {
    const p = this.currentPath()
    const home = this.homeDir
    const crumbs: { name: string; path: string }[] = []

    if (p === home) {
      crumbs.push({ name: "~", path: home })
    } else if (p.startsWith(home + "/")) {
      crumbs.push({ name: "~", path: home })
      const rel = p.slice(home.length + 1)
      const parts = rel.split("/").filter(Boolean)
      let current = home
      for (const part of parts) {
        current += "/" + part
        crumbs.push({ name: part, path: current })
      }
    } else {
      crumbs.push({ name: "/", path: "/" })
      const parts = p.split("/").filter(Boolean)
      let current = ""
      for (const part of parts) {
        current += "/" + part
        crumbs.push({ name: part, path: current })
      }
    }
    return crumbs
  })

  public readonly filteredItems = createComputed(() => {
    const query = this.searchQuery().toLowerCase().trim()
    const hidden = this.showHidden()
    let list = this.items()

    if (!hidden) {
      list = list.filter((item) => !item.isHidden)
    }

    if (query) {
      list = list.filter((item) => item.name.toLowerCase().includes(query))
    }

    // Sort folders first, then alphabetical
    return list.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    })
  })

  public readonly itemCountStr = createComputed(() => {
    const count = this.filteredItems().length
    return `${count} ${count === 1 ? "item" : "items"}`
  })

  public readonly selectedItem = createComputed(() => {
    const sel = this.selectedPath()
    if (!sel) return null
    return this.filteredItems().find((it) => it.path === sel) || null
  })

  public readonly totalDirectorySizeStr = createComputed(() => {
    const totalBytes = this.filteredItems().reduce((acc, it) => acc + it.sizeBytes, 0)
    return formatBytes(totalBytes)
  })

  constructor() {
    this.loadPinnedFromDisk()
    this.loadDirectory(this.currentPath())
  }

  // --- Pinned Persistence ---
  private getPinnedConfigPath(): string {
    return `${GLib.get_user_config_dir()}/miri-shell/pinned-folders.json`
  }

  private loadPinnedFromDisk() {
    try {
      const file = Gio.File.new_for_path(this.getPinnedConfigPath())
      if (file.query_exists(null)) {
        const [, contents] = file.load_contents(null)
        const text = new TextDecoder().decode(contents)
        const arr = JSON.parse(text)
        if (Array.isArray(arr) && arr.length > 0) {
          this._pinned[1](arr)
          return
        }
      }
    } catch {
      // ignore
    }

    // Default pinned projects
    const defaults = [
      `${this.homeDir}/Projects`,
      `${this.homeDir}/Projects/miri-shell`,
    ]
    const existing = defaults.filter((p) => Gio.File.new_for_path(p).query_exists(null))
    this._pinned[1](existing.length > 0 ? existing : [`${this.homeDir}/Projects`])
  }

  private savePinnedToDisk() {
    try {
      const dir = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/miri-shell`)
      if (!dir.query_exists(null)) {
        dir.make_directory_with_parents(null)
      }
      const file = Gio.File.new_for_path(this.getPinnedConfigPath())
      const data = JSON.stringify(this.pinned(), null, 2)
      file.replace_contents(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null)
    } catch {
      // ignore
    }
  }

  public isPinned(path: string): boolean {
    return this.pinned().includes(path)
  }

  public pinFolder(path: string) {
    if (!this.isPinned(path)) {
      const list = [...this.pinned(), path]
      this._pinned[1](list)
      this.savePinnedToDisk()
      this._statusText[1](`Pinned "${path.split("/").pop()}" to sidebar`)
      setTimeout(() => this._statusText[1](""), 2000)
    }
  }

  public unpinFolder(path: string) {
    const list = this.pinned().filter((p) => p !== path)
    this._pinned[1](list)
    this.savePinnedToDisk()
    this._statusText[1](`Unpinned from sidebar`)
    setTimeout(() => this._statusText[1](""), 2000)
  }

  public togglePin(path: string) {
    if (this.isPinned(path)) {
      this.unpinFolder(path)
    } else {
      this.pinFolder(path)
    }
  }

  public togglePinnedExpanded() {
    this._pinnedExpanded[1](!this.pinnedExpanded())
  }

  // --- Directory Navigation & Loading ---
  public loadDirectory(targetPath: string) {
    this._isLoading[1](true)
    this._selectedPath[1]("")

    try {
      const dir = Gio.File.new_for_path(targetPath)
      const enumerator = dir.enumerate_children(
        "standard::*,time::*",
        Gio.FileQueryInfoFlags.NONE,
        null
      )

      const fileItems: FileItem[] = []
      let info: Gio.FileInfo | null

      while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name()
        const isDir = info.get_file_type() === Gio.FileType.DIRECTORY
        const isSymlink = info.get_is_symlink()
        const isHidden = info.get_is_hidden() || name.startsWith(".")
        const sizeBytes = info.get_size()
        const modifiedSec = info.get_modification_date_time()?.to_unix() || 0

        let dateStr = ""
        if (modifiedSec > 0) {
          const d = new Date(modifiedSec * 1000)
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        }

        const { icon, category } = getFileCategory(name, isDir)

        fileItems.push({
          name,
          path: `${targetPath.replace(/\/$/, "")}/${name}`,
          isDir,
          isSymlink,
          isHidden,
          sizeBytes,
          sizeStr: isDir ? "" : formatBytes(sizeBytes),
          modifiedSec,
          dateStr,
          icon,
          category,
          extension: name.includes(".") ? name.split(".").pop() || "" : "",
        })
      }

      this._items[1](fileItems)
      this._currentPath[1](targetPath)
      this._statusText[1]("")
    } catch (e: any) {
      this._statusText[1](`Failed to open folder: ${e.message || "Permission denied"}`)
    } finally {
      this._isLoading[1](false)
    }
  }

  public navigateTo(targetPath: string) {
    if (targetPath === this.currentPath()) return

    const hist = this._history[0]().slice(0, this._historyIndex[0]() + 1)
    hist.push(targetPath)
    this._history[1](hist)
    this._historyIndex[1](hist.length - 1)

    this.loadDirectory(targetPath)
  }

  public goBack() {
    if (this.canGoBack()) {
      const newIdx = this._historyIndex[0]() - 1
      this._historyIndex[1](newIdx)
      this.loadDirectory(this._history[0]()[newIdx])
    }
  }

  public goForward() {
    if (this.canGoForward()) {
      const newIdx = this._historyIndex[0]() + 1
      this._historyIndex[1](newIdx)
      this.loadDirectory(this._history[0]()[newIdx])
    }
  }

  public goUp() {
    if (this.canGoUp()) {
      const parent = Gio.File.new_for_path(this.currentPath()).get_parent()
      if (parent) {
        const parentPath = parent.get_path()
        if (parentPath) {
          this.navigateTo(parentPath)
        }
      }
    }
  }

  public refresh() {
    this.loadDirectory(this.currentPath())
  }

  public toggleHidden() {
    this._showHidden[1](!this.showHidden())
  }

  public toggleViewMode() {
    this._viewMode[1](this.viewMode() === "grid" ? "list" : "grid")
  }

  public setSearchQuery(q: string) {
    this._searchQuery[1](q)
  }

  public setSelectedPath(path: string) {
    this._selectedPath[1](path)
  }

  public selectNext() {
    const list = this.filteredItems()
    if (list.length === 0) return
    const currentIdx = list.findIndex((it) => it.path === this.selectedPath())
    const nextIdx = currentIdx < 0 || currentIdx >= list.length - 1 ? 0 : currentIdx + 1
    this.setSelectedPath(list[nextIdx].path)
  }

  public selectPrev() {
    const list = this.filteredItems()
    if (list.length === 0) return
    const currentIdx = list.findIndex((it) => it.path === this.selectedPath())
    const prevIdx = currentIdx <= 0 ? list.length - 1 : currentIdx - 1
    this.setSelectedPath(list[prevIdx].path)
  }

  public openSelected() {
    const sel = this.selectedItem()
    if (sel) {
      this.openItem(sel)
    }
  }

  public openItem(item: FileItem) {
    if (item.isDir) {
      this.navigateTo(item.path)
    } else {
      this.openFile(item.path)
    }
  }

  public openFile(path: string) {
    try {
      const file = Gio.File.new_for_path(path)
      Gio.AppInfo.launch_default_for_uri_async(file.get_uri(), null, null, null)
    } catch {
      execAsync(`gio open "${path}" || xdg-open "${path}"`).catch(() => {})
    }
  }

  // --- Developer Shortcuts ---
  public openWithAntigravity(path: string) {
    const targetDir = Gio.File.new_for_path(path).query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY
      ? path
      : Gio.File.new_for_path(path).get_parent()?.get_path() || this.currentPath()

    execAsync(`sh -c 'if which agy >/dev/null 2>&1; then agy "${path}"; elif which antigravity >/dev/null 2>&1; then antigravity "${path}"; elif which code >/dev/null 2>&1; then code "${path}"; elif which cursor >/dev/null 2>&1; then cursor "${path}"; else gio open "${path}" || xdg-open "${path}"; fi'`).catch(() => {})
    this._statusText[1](`Opening with Antigravity IDE...`)
    setTimeout(() => this._statusText[1](""), 2000)
  }

  public openWithVSCode(path: string) {
    execAsync(`sh -c 'code "${path}" || codium "${path}" || vscodium "${path}" || cursor "${path}" || gio open "${path}" || xdg-open "${path}"'`).catch(() => {})
    this._statusText[1](`Opening with Code Editor...`)
    setTimeout(() => this._statusText[1](""), 2000)
  }

  public openInTerminal(path: string) {
    const targetDir = Gio.File.new_for_path(path).query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY
      ? path
      : Gio.File.new_for_path(path).get_parent()?.get_path() || this.currentPath()

    execAsync(`sh -c 'cd "${targetDir}" && (ptyxis --working-directory="${targetDir}" || foot -D "${targetDir}" || alacritty --working-directory "${targetDir}" || kitty --directory "${targetDir}" || gnome-terminal --working-directory="${targetDir}" || konsole --workdir "${targetDir}" || xfce4-terminal --working-directory="${targetDir}" || xterm)'`).catch(() => {})
  }

  public openLazyGit(path: string) {
    const targetDir = Gio.File.new_for_path(path).query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY
      ? path
      : Gio.File.new_for_path(path).get_parent()?.get_path() || this.currentPath()

    execAsync(`sh -c 'cd "${targetDir}" && (ptyxis -e lazygit || foot lazygit || alacritty -e lazygit || kitty -e lazygit || gnome-terminal -- lazygit || konsole -e lazygit || git-cola || xterm -e lazygit)'`).catch(() => {})
  }

  public copyPath(path: string) {
    execAsync(`sh -c 'wl-copy "${path}" 2>/dev/null || xclip -selection clipboard "${path}" 2>/dev/null || xsel --clipboard --input "${path}" 2>/dev/null'`).catch(() => {})
    this._statusText[1](`Copied path to clipboard`)
    setTimeout(() => this._statusText[1](""), 2000)
  }

  public async moveToTrash(path: string) {
    try {
      const file = Gio.File.new_for_path(path)
      await new Promise<void>((resolve, reject) => {
        file.trash_async(GLib.PRIORITY_DEFAULT, null, (_f, res) => {
          try {
            file.trash_finish(res)
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      })
      this.refresh()
      this._statusText[1](`Moved to trash`)
      setTimeout(() => this._statusText[1](""), 2000)
    } catch (e: any) {
      this._statusText[1](`Failed to trash: ${e.message}`)
    }
  }

  public async createFolder(name: string) {
    if (!name.trim()) return
    const newPath = `${this.currentPath().replace(/\/$/, "")}/${name.trim()}`
    try {
      const dir = Gio.File.new_for_path(newPath)
      dir.make_directory(null)
      this.refresh()
      this._statusText[1](`Created folder "${name.trim()}"`)
      setTimeout(() => this._statusText[1](""), 2000)
    } catch (e: any) {
      this._statusText[1](`Failed to create folder: ${e.message}`)
    }
  }
}

export const FS = new FilesystemService()
export default FS
