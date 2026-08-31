# miri-shell

Custom Linux desktop shell for **Hyprland** built with **AGS (Aylur's GTK Shell)** and **Astal** in TypeScript/JSX.

---

## 📁 Project Structure

```text
miri-shell/
├── app.ts            # Entry point for AGS
├── widget/           # Widget components (JSX/TSX)
│   └── Bar.tsx       # Top status bar
├── style.scss        # Shell styling (SCSS / GTK CSS)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── env.d.ts          # Type declarations
```

---

## 🚀 Getting Started

### Development / Running the Shell

To start the shell:

```bash
ags run app.ts
# or
npm run dev
```

To close or quit the running instance:

```bash
ags quit
# or
npm run quit
```

### Bundling for Production

```bash
npm run bundle
```

---

## 🪟 Hyprland Integration

To autostart `miri-shell` when logging into Hyprland, add the following to your `hyprland.conf` (e.g. `~/.config/hypr/hyprland.conf`):

```ini
exec-once = ags run /path/to/miri-shell/app.ts
```

Or if linked into `~/.config/ags`:

```ini
exec-once = ags run
```
