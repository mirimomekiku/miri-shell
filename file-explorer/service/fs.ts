import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import { Lucide } from "./icons"

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
  extension: string
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) {
    if (name === ".git") return Lucide["folder-git"]
    return Lucide["folder"]
  }

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""

  if (["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp", "ico"].includes(ext)) {
    return Lucide["image"]
  }
  if (["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"].includes(ext)) {
    return Lucide["music"]
  }
  if (["mp4", "mkv", "webm", "avi", "mov", "wmv", "flv"].includes(ext)) {
    return Lucide["video"]
  }
  if (["zip", "tar", "gz", "xz", "7z", "bz2", "rar", "iso"].includes(ext)) {
    return Lucide["archive"]
  }
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "c", "cpp", "h", "hpp", "java", "json", "html", "css", "scss", "sh", "bash", "zsh", "toml", "yaml", "yml", "xml", "lua"].includes(ext)) {
    return Lucide["file-code"]
  }
  if (["md", "txt", "pdf", "doc", "docx", "rtf", "odt", "csv", "tsv", "log"].includes(ext)) {
    return Lucide["file-text"]
  }

  return Lucide["file"]
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

  public readonly currentPath = this._currentPath[0]
  public readonly items = this._items[0]
  public readonly isLoading = this._isLoading[0]
  public readonly showHidden = this._showHidden[0]
  public readonly searchQuery = this._searchQuery[0]
  public readonly viewMode = this._viewMode[0]
  public readonly selectedPath = this._selectedPath[0]
  public readonly statusText = this._statusText[0]

  public readonly canGoBack = createComputed(() => this._historyIndex[0]() > 0)
  public readonly canGoForward = createComputed(
    () => this._historyIndex[0]() < this._history[0]().length - 1
  )
  public readonly canGoUp = createComputed(() => {
    const p = this.currentPath()
    return p !== "/" && p.length > 1
  })

  public readonly homeDir = GLib.get_home_dir()

  public readonly breadcrumbs = createComputed(() => {
    const p = this.currentPath()
    const parts = p.split("/").filter(Boolean)
    const crumbs: { name: string; path: string }[] = [{ name: "Root", path: "/" }]

    let current = ""
    for (const part of parts) {
      current += "/" + part
      crumbs.push({ name: part, path: current })
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

  constructor() {
    this.loadDirectory(this.currentPath())
  }

  public async loadDirectory(targetPath: string) {
    this._isLoading[1](true)
    this._selectedPath[1]("")

    try {
      const dir = Gio.File.new_for_path(targetPath)
      const enumerator = await new Promise<Gio.FileEnumerator>((resolve, reject) => {
        dir.enumerate_children_async(
          "standard::*,time::*",
          Gio.FileQueryInfoFlags.NONE,
          GLib.PRIORITY_DEFAULT,
          null,
          (file, res) => {
            try {
              resolve(dir.enumerate_children_finish(res))
            } catch (err) {
              reject(err)
            }
          }
        )
      })

      const fileItems: FileItem[] = []
      let nextBatch: Gio.FileInfo[]

      while ((nextBatch = enumerator.next_files(50, null)).length > 0) {
        for (const info of nextBatch) {
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

          fileItems.push({
            name,
            path: `${targetPath.replace(/\/$/, "")}/${name}`,
            isDir,
            isSymlink,
            isHidden,
            sizeBytes,
            sizeStr: isDir ? "--" : formatBytes(sizeBytes),
            modifiedSec,
            dateStr,
            icon: getFileIcon(name, isDir),
            extension: name.includes(".") ? name.split(".").pop() || "" : "",
          })
        }
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
      execAsync(`xdg-open "${path}"`).catch(() => {})
    }
  }

  public openTerminal(path: string) {
    const targetDir = Gio.File.new_for_path(path).query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY
      ? path
      : Gio.File.new_for_path(path).get_parent()?.get_path() || this.currentPath()

    execAsync(`sh -c 'cd "${targetDir}" && (kitty || alacritty || foot || gnome-terminal || xterm)'`).catch(() => {})
  }

  public copyPath(path: string) {
    execAsync(`wl-copy "${path}"`).catch(() => {})
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
    } catch (e: any) {
      this._statusText[1](`Failed to create folder: ${e.message}`)
    }
  }
}

export const FS = new FilesystemService()
export default FS
