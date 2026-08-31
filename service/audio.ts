import { createPoll } from "ags/time"
import { createComputed } from "gnim"
import { execAsync } from "ags/process"

class AudioService {
  // Poll volume using wpctl (or pactl fallback)
  public readonly volumeData = createPoll({ volume: 54, muted: false }, 1000, async () => {
    try {
      const out = await execAsync("wpctl get-volume @DEFAULT_AUDIO_SINK@")
      // Output format: "Volume: 0.54" or "Volume: 0.54 [MUTED]"
      const match = out.match(/Volume:\s+([0-9.]+)(\s+\[MUTED\])?/)
      if (match) {
        const vol = Math.round(parseFloat(match[1]) * 100)
        const isMuted = Boolean(match[2])
        return { volume: vol, muted: isMuted }
      }
    } catch {
      // fallback to pamixer or pactl
    }
    return { volume: 50, muted: false }
  })

  public readonly volume = createComputed(() => this.volumeData().volume)
  public readonly volumeRatio = createComputed(() => this.volume() / 100)
  public readonly isMuted = createComputed(() => this.volumeData().muted)

  public readonly percentageText = createComputed(() => {
    return `${this.volume()}%`
  })

  public readonly icon = createComputed(() => {
    if (this.isMuted()) return "󰝟"
    const vol = this.volume()
    if (vol >= 60) return "󰕾"
    if (vol >= 25) return "󰖀"
    return "󰕿"
  })

  public setVolume(percent: number) {
    const val = (percent / 100).toFixed(2)
    execAsync(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${val}`).catch(() => {})
  }

  public toggleMute() {
    execAsync("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle").catch(() => {})
  }
}

export const Audio = new AudioService()
export default Audio
