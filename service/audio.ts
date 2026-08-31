import { createPoll } from "ags/time"
import { createState, createComputed } from "gnim"
import { execAsync } from "ags/process"

import { Lucide } from "./icons"

class AudioService {
  private _volume = createState<number>(54)
  private _muted = createState<boolean>(false)
  private _debounceTimer: any = null

  public readonly volume = this._volume[0]
  public readonly isMuted = this._muted[0]

  public readonly volumeRatio = createComputed(() => this.volume() / 100)

  public readonly percentageText = createComputed(() => {
    return `${this.volume()}%`
  })

  public readonly icon = createComputed(() => {
    if (this.isMuted()) return Lucide["volume-x"]
    const vol = this.volume()
    if (vol >= 60) return Lucide["volume-2"]
    if (vol >= 25) return Lucide["volume-1"]
    return Lucide["volume"]
  })

  // Poll in background to keep in sync with external volume changes (e.g. keyboard media keys)
  public readonly poller = createPoll(null, 1000, async () => {
    try {
      const out = await execAsync("wpctl get-volume @DEFAULT_AUDIO_SINK@")
      const match = out.match(/Volume:\s+([0-9.]+)(\s+\[MUTED\])?/)
      if (match) {
        const vol = Math.round(parseFloat(match[1]) * 100)
        const isMuted = Boolean(match[2])
        if (this._volume[0]() !== vol) {
          this._volume[1](vol)
        }
        if (this._muted[0]() !== isMuted) {
          this._muted[1](isMuted)
        }
      }
    } catch {
      // ignore
    }
    return null
  })

  public setVolume(percent: number) {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)))
    // Instant real-time UI state update (0ms delay)
    this._volume[1](clamped)
    if (this._muted[0]()) {
      this._muted[1](false)
    }

    // Apply to audio hardware
    if (this._debounceTimer) clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => {
      const val = (clamped / 100).toFixed(2)
      execAsync(`wpctl set-volume @DEFAULT_AUDIO_SINK@ ${val}`).catch(() => {})
    }, 10)
  }

  public toggleMute() {
    const next = !this.isMuted()
    this._muted[1](next)
    execAsync("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle").catch(() => {})
  }
}

export const Audio = new AudioService()
export default Audio
