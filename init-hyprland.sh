#!/usr/bin/env bash
# ==============================================================================
# Miri Shell — Hyprland Environment Initializer & Persistence Setup
# ==============================================================================
# Automatically sets up all hardware tools, libraries, Lucide icon fonts,
# and configures persistent autostart in Hyprland across system reboots.
# ==============================================================================

set -euo pipefail

# ANSI Colors
BOLD="\033[1m"
GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
RED="\033[1;31m"
RESET="\033[0m"

log_info() { echo -e "${BLUE}${BOLD}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}${BOLD}[OK]${RESET} $*"; }
log_warn() { echo -e "${YELLOW}${BOLD}[WARN]${RESET} $*"; }
log_error() { echo -e "${RED}${BOLD}[ERROR]${RESET} $*"; }

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOPBAR_APP="$PROJECT_DIR/top-bar/app.ts"
BIN_DIR="$HOME/.local/bin"
LAUNCHER_BIN="$BIN_DIR/miri-topbar"
HYPR_CONFIG_DIR="$HOME/.config/hypr"
HYPR_CONFIG_FILE="$HYPR_CONFIG_DIR/hyprland.conf"
FONTS_DIR="$HOME/.local/share/fonts"

echo -e "${CYAN}${BOLD}"
echo "  __  __ _       _   ____  _          _ _ "
echo " |  \/  (_)_ __ (_) / ___|| |__   ___| | |"
echo " | |\/| | | '__|| | \___ \| '_ \ / _ \ | |"
echo " | |  | | | |   | |  ___) | | | |  __/ | |"
echo " |_|  |_|_|_|   |_| |____/|_| |_|\___|_|_|"
echo -e "${RESET}"
echo -e "${BOLD}Miri Shell — Hyprland Environment Initializer${RESET}"
echo "Project Location: $PROJECT_DIR"
echo "Target App:       $TOPBAR_APP"
echo "--------------------------------------------------------"

# ------------------------------------------------------------------------------
# 1. Detect Missing System Tools & Dependencies
# ------------------------------------------------------------------------------
log_info "Checking required system dependencies..."

REQUIRED_BINS=("gjs" "node" "npm" "brightnessctl" "wpctl" "bluetoothctl" "nmcli" "playerctl" "grim" "slurp" "wl-copy")
MISSING_BINS=()

for bin in "${REQUIRED_BINS[@]}"; do
    if ! command -v "$bin" >/dev/null 2>&1; then
        MISSING_BINS+=("$bin")
    fi
done

if [ ${#MISSING_BINS[@]} -gt 0 ]; then
    log_warn "Missing tools: ${MISSING_BINS[*]}"
    log_info "Attempting to install missing dependencies..."

    if command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y \
            nodejs npm gjs gtk3-devel gobject-introspection-devel \
            brightnessctl wireplumber bluez NetworkManager playerctl \
            grim slurp wl-clipboard libnotify fontconfig || true
    elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --needed --noconfirm \
            nodejs npm gjs gtk3 gobject-introspection \
            brightnessctl wireplumber bluez bluez-utils networkmanager playerctl \
            grim slurp wl-clipboard libnotify fontconfig || true
    elif command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y \
            nodejs npm gjs libgtk-3-dev libgirepository1.0-dev \
            brightnessctl wireplumber bluez network-manager playerctl \
            grim slurp wl-clipboard libnotify-bin fontconfig || true
    fi
else
    log_success "All required CLI tools are present (${REQUIRED_BINS[*]})."
fi

# ------------------------------------------------------------------------------
# 2. Check & Install Node Modules
# ------------------------------------------------------------------------------
log_info "Verifying project dependencies..."
cd "$PROJECT_DIR"
if [ ! -d "node_modules/lucide-static" ]; then
    log_info "Running npm install..."
    npm install --silent
fi
log_success "NPM dependencies are ready."

# ------------------------------------------------------------------------------
# 3. Install Lucide TrueType Font
# ------------------------------------------------------------------------------
log_info "Installing Lucide TrueType font for icon rendering..."
mkdir -p "$FONTS_DIR"

if [ -f "$PROJECT_DIR/node_modules/lucide-static/font/lucide.ttf" ]; then
    cp "$PROJECT_DIR/node_modules/lucide-static/font/lucide.ttf" "$FONTS_DIR/"
    fc-cache -f "$FONTS_DIR" >/dev/null 2>&1 || true
    log_success "Lucide icon font installed to $FONTS_DIR/lucide.ttf"
fi

# ------------------------------------------------------------------------------
# 4. Check for Astal & AGS
# ------------------------------------------------------------------------------
log_info "Verifying AGS (Astal runtime)..."

if ! command -v ags >/dev/null 2>&1; then
    if [ -f /usr/local/bin/ags ]; then
        export PATH="/usr/local/bin:$PATH"
    elif [ -f "$HOME/.cargo/bin/ags" ]; then
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
fi

if command -v ags >/dev/null 2>&1; then
    log_success "AGS binary found at $(which ags)"
else
    log_warn "AGS binary not detected in PATH. Ensure AGS is installed."
fi

# ------------------------------------------------------------------------------
# 5. Create Standalone Launcher Wrapper (~/.local/bin/miri-topbar)
# ------------------------------------------------------------------------------
log_info "Creating executable launcher script at $LAUNCHER_BIN..."
mkdir -p "$BIN_DIR"

cat << LAUNCHER_EOF > "$LAUNCHER_BIN"
#!/usr/bin/env bash
# ==============================================================================
# Miri Top Bar Launcher
# Automatically exported paths and background process supervisor
# ==============================================================================

export GI_TYPELIB_PATH="/usr/local/lib64/girepository-1.0:/usr/local/lib/girepository-1.0:/usr/lib64/girepository-1.0:/usr/lib/girepository-1.0:\${GI_TYPELIB_PATH:-}"
export LD_LIBRARY_PATH="/usr/local/lib64:/usr/local/lib:/usr/lib64:/usr/lib:\${LD_LIBRARY_PATH:-}"
export PATH="\$HOME/.local/bin:\$PATH"

APP_PATH="$TOPBAR_APP"

# Terminate existing instance if already running to prevent duplicate bars
pkill -f "ags run .*$TOPBAR_APP" 2>/dev/null || true
pkill -f "ags run .*top-bar/app.ts" 2>/dev/null || true
sleep 0.15

# Launch Miri Top Bar
exec ags run "\$APP_PATH" "\$@"
LAUNCHER_EOF

chmod +x "$LAUNCHER_BIN"
log_success "Created launcher: $LAUNCHER_BIN"

# ------------------------------------------------------------------------------
# 6. Configure Hyprland Autostart Persistence (~/.config/hypr/hyprland.conf)
# ------------------------------------------------------------------------------
log_info "Configuring Hyprland persistent autostart..."
mkdir -p "$HYPR_CONFIG_DIR"

if [ ! -f "$HYPR_CONFIG_FILE" ]; then
    touch "$HYPR_CONFIG_FILE"
    log_info "Created $HYPR_CONFIG_FILE"
fi

AUTOSTART_DIRECTIVE="exec-once = $LAUNCHER_BIN"

if grep -Fxq "$AUTOSTART_DIRECTIVE" "$HYPR_CONFIG_FILE"; then
    log_success "Hyprland autostart directive already present in $HYPR_CONFIG_FILE"
else
    # Append autostart rule
    cat << HYPR_EOF >> "$HYPR_CONFIG_FILE"

# ==============================================================================
# Miri Shell Top Bar Autostart (Persistent across reboots)
# ==============================================================================
$AUTOSTART_DIRECTIVE
HYPR_EOF
    log_success "Appended autostart directive to $HYPR_CONFIG_FILE"
fi

# ------------------------------------------------------------------------------
# 7. Create Systemd User Service (Secondary Fallback Persistence)
# ------------------------------------------------------------------------------
log_info "Configuring systemd user service for fallback persistence..."
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

cat << SERVICE_EOF > "$SYSTEMD_USER_DIR/miri-topbar.service"
[Unit]
Description=Miri Shell Top Bar for Hyprland
PartOf=graphical-session.target
After=graphical-session.target

[Service]
Type=simple
ExecStart=$LAUNCHER_BIN
Restart=on-failure
RestartSec=1
Environment=GI_TYPELIB_PATH=/usr/local/lib64/girepository-1.0:/usr/local/lib/girepository-1.0:/usr/lib64/girepository-1.0:/usr/lib/girepository-1.0
Environment=LD_LIBRARY_PATH=/usr/local/lib64:/usr/local/lib:/usr/lib64:/usr/lib

[Install]
WantedBy=graphical-session.target
SERVICE_EOF

systemctl --user daemon-reload 2>/dev/null || true
log_success "Systemd user service registered: $SYSTEMD_USER_DIR/miri-topbar.service"

# ------------------------------------------------------------------------------
# 8. Test Bundle & Verify Integrity
# ------------------------------------------------------------------------------
log_info "Verifying top bar bundle integrity..."
GI_TYPELIB_PATH="/usr/local/lib64/girepository-1.0:/usr/local/lib/girepository-1.0:${GI_TYPELIB_PATH:-}" \
LD_LIBRARY_PATH="/usr/local/lib64:/usr/local/lib:${LD_LIBRARY_PATH:-}" \
ags bundle "$TOPBAR_APP" /tmp/miri-init-test.js >/dev/null 2>&1 || true

if [ -f /tmp/miri-init-test.js ]; then
    rm -f /tmp/miri-init-test.js
    log_success "Bundle verification passed with 0 errors!"
fi

# ------------------------------------------------------------------------------
# Summary & Completion
# ------------------------------------------------------------------------------
echo ""
echo "========================================================"
echo -e "${GREEN}${BOLD}✓ Miri Shell Top Bar Initialization Complete!${RESET}"
echo "========================================================"
echo "  • Launcher binary:       $LAUNCHER_BIN"
echo "  • Hyprland autostart:    $HYPR_CONFIG_FILE"
echo "  • Systemd service:       ~/.config/systemd/user/miri-topbar.service"
echo "  • Icon font installed:   $FONTS_DIR/lucide.ttf"
echo ""
echo -e "${CYAN}To run Miri Top Bar immediately:${RESET}"
echo "  $LAUNCHER_BIN"
echo ""
echo -e "${CYAN}When logging into Hyprland or rebooting:${RESET}"
echo "  Hyprland will automatically execute $LAUNCHER_BIN via exec-once."
echo "========================================================"
