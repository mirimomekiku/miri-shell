import { createPoll } from "ags/time"
import { createComputed, createState } from "gnim"
import { execAsync } from "ags/process"

export interface MediaState {
  player: string
  status: "Playing" | "Paused" | "Stopped" | "None"
  artist: string
  title: string
  artUrl: string
  position: number // in seconds
  length: number // in seconds
}

const defaultState: MediaState = {
  player: "",
  status: "None",
  artist: "No media playing",
  title: "Nothing Playing",
  artUrl: "",
  position: 0,
  length: 0,
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? "0" : ""}${s}`
}

class MediaService {
  private _isOpen = createState<boolean>(false)
  public readonly isOpen = this._isOpen[0]

  public toggleOpen() {
    const next = !this.isOpen()
    this._isOpen[1](next)
  }

  public setOpen(open: boolean) {
    this._isOpen[1](open)
  }

  // Poll metadata every 1000ms
  public readonly data = createPoll(defaultState, 1000, async () => {
    try {
      // Format: playerName|status|artist|title|artUrl|position|length
      const out = await execAsync(
        "playerctl -a metadata --format '{{playerName}}|{{status}}|{{artist}}|{{title}}|{{mpris:artUrl}}|{{position}}|{{mpris:length}}'"
      )

      const lines = out.trim().split("\n").filter(Boolean)
      if (lines.length === 0) return defaultState

      // Find the first playing player, or the first available player
      const activeLine = lines.find((l) => l.includes("|Playing|")) || lines[0]
      const [player, status, artist, title, artUrl, posMicro, lenMicro] = activeLine.split("|")

      const positionSec = posMicro ? parseInt(posMicro, 10) / 1000000 : 0
      const lengthSec = lenMicro ? parseInt(lenMicro, 10) / 1000000 : 0

      let cleanArtUrl = (artUrl || "").trim()
      if (cleanArtUrl.startsWith("file://")) {
        cleanArtUrl = cleanArtUrl.replace("file://", "")
      }

      return {
        player: player || "",
        status: (status as any) || "None",
        artist: artist || "Unknown Artist",
        title: title || "Unknown Track",
        artUrl: cleanArtUrl,
        position: positionSec,
        length: lengthSec,
      }
    } catch {
      return defaultState
    }
  })

  public readonly title = createComputed(() => this.data().title)
  public readonly artist = createComputed(() => this.data().artist)
  public readonly artUrl = createComputed(() => this.data().artUrl)
  public readonly isPlaying = createComputed(() => this.data().status === "Playing")
  public readonly hasMedia = createComputed(() => this.data().status !== "None" && this.data().title !== "Nothing Playing")

  public readonly positionStr = createComputed(() => formatTime(this.data().position))
  public readonly lengthStr = createComputed(() => formatTime(this.data().length))

  public readonly progress = createComputed(() => {
    const { position, length } = this.data()
    if (!length || length <= 0) return 0
    return Math.min(1, Math.max(0, position / length))
  })

  public readonly playPauseIcon = createComputed(() => {
    return this.isPlaying() ? "󰏤" : "󰐊"
  })

  public playPause() {
    execAsync("playerctl play-pause").catch(() => {})
  }

  public next() {
    execAsync("playerctl next").catch(() => {})
  }

  public previous() {
    execAsync("playerctl previous").catch(() => {})
  }

  public setPositionRatio(ratio: number) {
    const len = this.data().length
    if (len > 0) {
      const targetSec = Math.round(ratio * len)
      execAsync(`playerctl position ${targetSec}`).catch(() => {})
    }
  }
}

export const Media = new MediaService()
export default Media
