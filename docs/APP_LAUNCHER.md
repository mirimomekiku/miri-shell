# Miri App Launcher (macOS Spotlight / Raycast Style)

A high-performance, dark-themed global application launcher and command palette built with **Aylur's GTK (Astal / AGS)** for Linux / Hyprland.

---

## ✨ Features

- **macOS Spotlight / Raycast Interface**:
  - Centered floating modal window with seamless auto-focus search entry.
  - Charcoal `#18191c` and `#22242e` palette 100% synchronized with `top-bar`.
  - Flat, shadowless modern design with Lucide icons.
- **Instant Application Launching**:
  - Auto-discovers all `.desktop` applications installed on your system.
  - Fuzzy searches title, executable name, comments, and keywords.
  - Automatically sorts frequently used applications to the top.
- **Smart Actions**:
  - **Inline Math Calculator**: Type `25 * 4`, `sqrt(144)`, `(500 * 1.12)` for instant evaluated answers. Pressing Enter copies the result directly to your clipboard (`wl-copy`).
  - **Terminal Command Runner (`>` or `$`)**: Type `> htop`, `> git status`, `> btop` to launch command in terminal.
  - **Web Search (`?` or `g:`)**: Type `? hyprland config` to search Google in your default web browser.
- **Keyboard-First Navigation**:
  - `↑` / `↓` / `Tab`: Cycle through results.
  - `Enter`: Launch selected application or action.
  - `Escape`: Instantly dismiss the launcher.

---

## ⌨️ Hyprland Keybinding Configuration

Add the following keybinding to your `~/.config/hypr/hyprland.conf`:

```ini
# Spotlight / Raycast Global App Launcher
bind = $mainMod, SPACE, exec, ~/.local/bin/miri-launcher
```

---

## 🚀 Usage & Commands

### Development
```bash
cd app-launcher
npm run dev
```

Or from repository root:
```bash
npm run dev:launcher
```

### Standalone Launcher
```bash
~/.local/bin/miri-launcher
```
