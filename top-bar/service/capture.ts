import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"
import ControlCenter from "./controlcenter"
import { Lucide } from "./icons"

class CaptureService {
  private _isRecording = createState<boolean>(false)
  public readonly isRecording = this._isRecording[0]

  public readonly recordIcon = createComputed(() => {
    return this.isRecording() ? Lucide["radio"] : Lucide["video"]
  })

  public readonly cameraIcon = Lucide["camera"]
  public readonly settingsIcon = Lucide["settings"]

  public async takeScreenshot(mode: "region" | "screen" = "region") {
    // Temporarily hide dropdown so it's not captured in screenshot
    ControlCenter.setOpen(false)

    // Small delay to allow dropdown closing animation
    setTimeout(async () => {
      try {
        const cmd =
          mode === "region"
            ? `sh -c 'DIR="$HOME/Pictures/Screenshots"; mkdir -p "$DIR"; FILE="$DIR/Screenshot_$(date +%Y-%m-%d_%H-%M-%S).png"; if which hyprshot >/dev/null 2>&1; then hyprshot -m region -o "$DIR" -f "$(basename "$FILE")"; elif which grim >/dev/null 2>&1 && which slurp >/dev/null 2>&1; then grim -g "$(slurp)" "$FILE" && which wl-copy >/dev/null 2>&1 && wl-copy < "$FILE" && notify-send "Screenshot Saved" "Saved to $FILE and copied to clipboard." -i "$FILE"; else gnome-screenshot -a -f "$FILE"; fi'`
            : `sh -c 'DIR="$HOME/Pictures/Screenshots"; mkdir -p "$DIR"; FILE="$DIR/Screenshot_$(date +%Y-%m-%d_%H-%M-%S).png"; if which grim >/dev/null 2>&1; then grim "$FILE" && which wl-copy >/dev/null 2>&1 && wl-copy < "$FILE" && notify-send "Screenshot Saved" "Saved to $FILE and copied to clipboard." -i "$FILE"; else gnome-screenshot -f "$FILE"; fi'`

        await execAsync(cmd)
      } catch {
        // User cancelled slurp/region selection
      }
    }, 200)
  }

  public async toggleRecording() {
    if (this.isRecording()) {
      // Stop recording
      this._isRecording[1](false)
      try {
        await execAsync("sh -c 'pkill -SIGINT wf-recorder || pkill -SIGINT wl-screenrec || pkill -SIGINT ffmpeg || pkill -SIGINT gpu-screen-recorder'")
        await execAsync('notify-send "Recording Stopped" "Video saved to ~/Videos/Recordings"')
      } catch {
        // ignore
      }
    } else {
      // Start recording
      ControlCenter.setOpen(false)
      setTimeout(async () => {
        try {
          this._isRecording[1](true)
          await execAsync('notify-send "Recording Started" "Screen recording in progress..."')
          const cmd = `sh -c 'DIR="$HOME/Videos/Recordings"; mkdir -p "$DIR"; FILE="$DIR/Recording_$(date +%Y-%m-%d_%H-%M-%S).mp4"; if which wf-recorder >/dev/null 2>&1; then wf-recorder -f "$FILE"; elif which wl-screenrec >/dev/null 2>&1; then wl-screenrec -f "$FILE"; else ffmpeg -y -f kmsgrab -i - -vf "hwdownload,format=bgr0" "$FILE"; fi'`
          await execAsync(cmd)
        } catch {
          this._isRecording[1](false)
        }
      }, 200)
    }
  }

  public openSettings() {
    execAsync("sh -c 'gnome-control-center || systemsettings || xfce4-settings-manager || pavucontrol'").catch(() => {})
  }
}

export const Capture = new CaptureService()
export default Capture
