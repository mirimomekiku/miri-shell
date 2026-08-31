#!/usr/bin/env bash

# ==============================================================================
# AGS (Aylur's GTK Shell) & Astal Installer for Fedora Linux
# ==============================================================================

set -Eeuo pipefail

# --- Color Formatting ---
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}${BOLD}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${BOLD}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}${BOLD}[ERROR]${NC} $1" >&2
}

# --- Error Handling Trap ---
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Installation failed at line ${1:-unknown} with exit code ${exit_code}."
        log_warn "If this is a dependency or compiler issue, review the error messages above."
    fi
}
trap 'cleanup ${LINENO}' EXIT

# --- Verification & Pre-flight Checks ---
log_info "Performing pre-flight checks..."

# 1. Check OS
if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    if [[ "${ID:-}" != "fedora" && "${ID_LIKE:-}" != *"fedora"* ]]; then
        log_warn "This script is tailored for Fedora Linux. Detected OS: ${PRETTY_NAME:-$ID}"
        read -rp "Do you still wish to continue? (y/N): " choice
        case "$choice" in
            [yY][eE][sS]|[yY]) ;;
            *) log_error "Aborted by user."; exit 1 ;;
        esac
    fi
else
    log_warn "Could not verify /etc/os-release. Proceeding with caution..."
fi

# 2. Check sudo / Root privileges
SUDO_CMD=""
if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo &>/dev/null; then
        SUDO_CMD="sudo"
        # Validate sudo credentials upfront
        $SUDO_CMD -v || { log_error "Failed to acquire sudo privileges"; exit 1; }
        # Keep-alive sudo timestamp
        while true; do $SUDO_CMD -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
    else
        log_error "'sudo' command not found and you are not running as root. Please install sudo or run as root."
        exit 1
    fi
fi

# 3. Check DNF
if ! command -v dnf &>/dev/null; then
    log_error "Package manager 'dnf' was not found on this system."
    exit 1
fi

# Prepare Build Workspace
BUILD_DIR="${TMPDIR:-/tmp}/ags-build-$(id -u)"
mkdir -p "$BUILD_DIR"
log_info "Using temporary build directory: $BUILD_DIR"

# ==============================================================================
# [1st Step] Install System Build Dependencies
# ==============================================================================
log_info "Step 1: Installing base build tools and GTK development packages via DNF..."

$SUDO_CMD dnf install -y \
    git \
    gcc \
    gcc-c++ \
    meson \
    ninja-build \
    vala \
    valadoc \
    gobject-introspection-devel \
    wayland-protocols-devel \
    wayland-devel \
    gtk3-devel \
    gtk-layer-shell-devel \
    gtk4-devel \
    gtk4-layer-shell-devel \
    json-glib-devel \
    libsoup3-devel \
    gdk-pixbuf2-devel \
    NetworkManager-libnm-devel \
    socat

log_success "Base dependencies installed successfully."

# ==============================================================================
# [2nd & 3rd Step] Clone & Build Astal Libraries
# ==============================================================================
log_info "Step 2: Cloning Astal repository..."

cd "$BUILD_DIR"
if [ -d "astal" ]; then
    log_info "Existing astal repository found. Pulling latest updates..."
    cd astal
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master
else
    git clone https://github.com/aylur/astal.git
    cd astal
fi

log_info "Step 3: Compiling and installing Astal libraries..."

build_and_install_astal_module() {
    local mod_path="$1"
    local mod_name="$2"
    local required="${3:-false}"

    if [ ! -d "$mod_path" ]; then
        log_warn "Astal module '$mod_path' not found in repository, skipping."
        return 0
    fi

    log_info "Building Astal module: $mod_name ($mod_path)..."
    pushd "$mod_path" > /dev/null
    rm -rf build
    if meson setup build --prefix=/usr/local; then
        if $SUDO_CMD meson install -C build; then
            log_success "Installed $mod_name."
        else
            log_error "Failed to install $mod_name."
            if [ "$required" = "true" ]; then popd > /dev/null; return 1; fi
        fi
    else
        log_error "Failed to configure $mod_name with Meson."
        if [ "$required" = "true" ]; then popd > /dev/null; return 1; fi
    fi
    popd > /dev/null
}

# Core Astal libraries (Required)
build_and_install_astal_module "lib/astal/io" "astal-io" true
build_and_install_astal_module "lib/astal/gtk3" "astal-gtk3" true
build_and_install_astal_module "lib/astal/gtk4" "astal-gtk4" true

# Astal Service libraries (Optional / plugins)
build_and_install_astal_module "lib/hyprland" "astal-hyprland" false
build_and_install_astal_module "lib/wireplumber" "astal-wireplumber" false
build_and_install_astal_module "lib/mpris" "astal-mpris" false
build_and_install_astal_module "lib/tray" "astal-tray" false
build_and_install_astal_module "lib/battery" "astal-battery" false
build_and_install_astal_module "lib/apps" "astal-apps" false
build_and_install_astal_module "lib/network" "astal-network" false

# Refresh dynamic linker cache and typelib paths
$SUDO_CMD ldconfig 2>/dev/null || true

# ==============================================================================
# [4th Step] Ensure Golang, Node.js, and CLI Build Prerequisites
# ==============================================================================
log_info "Step 4: Ensuring Golang, NPM, and CLI development dependencies..."

$SUDO_CMD dnf install -y \
    nodejs \
    npm \
    golang \
    meson \
    ninja-build \
    gobject-introspection-devel \
    gtk3-devel \
    gtk-layer-shell-devel \
    gtk4-devel \
    gtk4-layer-shell-devel

# Verify Golang version (AGS CLI requires Go >= 1.21)
if ! command -v go &>/dev/null; then
    log_error "Golang (go) is not available in PATH after installation."
    exit 1
fi

GO_VERSION_RAW=$(go version | awk '{print $3}' | sed 's/go//')
GO_MAJOR=$(echo "$GO_VERSION_RAW" | cut -d. -f1)
GO_MINOR=$(echo "$GO_VERSION_RAW" | cut -d. -f2)

log_info "Detected Go version: ${GO_VERSION_RAW}"
if [ "$GO_MAJOR" -lt 1 ] || { [ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -lt 21 ]; }; then
    log_error "AGS requires Go version >= 1.21 (detected: ${GO_VERSION_RAW}). Please upgrade golang."
    exit 1
fi

# Verify Node and NPM
if ! command -v npm &>/dev/null; then
    log_error "NPM is not installed or not found in PATH."
    exit 1
fi

log_success "Golang and Node/NPM requirements satisfied."

# ==============================================================================
# [5th Step] Clone & Build AGS CLI
# ==============================================================================
log_info "Step 5: Cloning and building AGS..."

cd "$BUILD_DIR"
if [ -d "ags" ]; then
    log_info "Existing ags repository found. Pulling latest updates..."
    cd ags
    git fetch origin
    git reset --hard origin/main || git reset --hard origin/master
else
    git clone https://github.com/aylur/ags.git
    cd ags
fi

log_info "Installing AGS npm dependencies..."
npm install

log_info "Configuring and compiling AGS with Meson..."
rm -rf build
meson setup build --prefix=/usr/local
$SUDO_CMD meson install -C build

# Refresh dynamic linker
$SUDO_CMD ldconfig 2>/dev/null || true

# ==============================================================================
# Post-Installation Verification
# ==============================================================================
log_info "Verifying AGS installation..."

if command -v ags &>/dev/null; then
    AGS_VER=$(ags --version 2>/dev/null || echo "installed")
    log_success "AGS successfully installed! (${AGS_VER})"
else
    log_warn "AGS binary was installed to /usr/local/bin. Ensure /usr/local/bin is in your \$PATH."
fi

# Check GObject Typelib discovery
if [ -d "/usr/local/lib64/girepository-1.0" ] || [ -d "/usr/local/lib/girepository-1.0" ]; then
    log_info "Note: If running in non-standard environments, you may set:"
    log_info "  export GI_TYPELIB_PATH=\"/usr/local/lib64/girepository-1.0:/usr/local/lib/girepository-1.0:\${GI_TYPELIB_PATH:-}\""
    log_info "  export LD_LIBRARY_PATH=\"/usr/local/lib64:/usr/local/lib:\${LD_LIBRARY_PATH:-}\""
fi

log_success "=========================================================="
log_success " AGS & Astal installation completed successfully on Fedora!"
log_success "=========================================================="
