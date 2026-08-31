# Miri File Explorer — Architecture & Usage Guide

**Location:** `./file-explorer/`  
**Launcher:** `~/.local/bin/miri-files` or `npm run dev:files`  
**Framework:** AGS (Astal 3.0 / GJS runtime) with TypeScript, GTK3, SCSS, and Lucide Icons

---

## 1. Overview & Features

`miri-file-explorer` is a custom Linux file manager tailored for Hyprland desktop environments. It delivers responsive navigation, clean dark aesthetic, and native Linux desktop integration.

### Core Features
- **Sidebar Quick Places**: Home (`~`), Projects, Downloads, Documents, Pictures, Music, Videos, Root System (`/`).
- **Interactive Breadcrumbs Bar**: Clickable path chips to navigate directly to any parent folder.
- **Dual View Modes**:
  - **Grid Mode**: Large touch-friendly cards with visual file type icons and formatted size tags.
  - **List Mode**: Compact detailed table with Name, Size, and Date Modified columns.
- **Smart Lucide File Icons**: Automatically maps files by extension to specialized icons (Images, Code/Scripts, Music, Videos, Archives, Documents, Git directories).
- **Search Filter**: Instant real-time fuzzy search within the current directory.
- **Context Actions (Right-Click Menu)**:
  - Open / Launch with default app (`xdg-open` / `Gio.AppInfo`)
  - Open in Terminal (`kitty`, `alacritty`, `foot`, `gnome-terminal`)
  - Copy Full Path to Clipboard (`wl-copy`)
  - Move to Trash (`Gio.File.trash_async`)
- **Keyboard Shortcuts**:
  - `Alt + Left`: Back
  - `Alt + Right`: Forward
  - `Alt + Up` or `Backspace`: Up
  - `Ctrl + H`: Toggle hidden files
  - `F5` / `Ctrl + R`: Refresh directory
  - `Ctrl + F`: Search files
  - `Escape`: Clear search

---

## 2. Directory Hierarchy

```text
file-explorer/
├── app.ts              # Entry point & Astal application initialization
├── style.scss          # SCSS dark charcoal styling & Lucide font rules
├── package.json        # NPM dependencies & scripts
├── tsconfig.json       # TypeScript JSX & compiler configuration
├── env.d.ts            # Typelib environment declarations
│
├── service/
│   ├── fs.ts           # Gio.File directory scanner, trash, launch & state
│   └── icons.ts        # Lucide icon Unicode font mappings
│
└── widget/
    ├── Window.tsx      # Main application window with shortcuts
    ├── Header.tsx      # Navigation buttons, breadcrumbs & search bar
    ├── Sidebar.tsx     # Quick places & places list
    └── FileView.tsx    # Reactive Grid & List views with right-click menu
```

---

## 3. Launching & Hyprland Keybinding

### Running from Terminal
```bash
npm run dev:files
# or
miri-files
```

### Binding to `Super + E` in Hyprland
Add this line to `~/.config/hypr/hyprland.conf`:
```ini
bind = $mainMod, E, exec, ~/.local/bin/miri-files
```
