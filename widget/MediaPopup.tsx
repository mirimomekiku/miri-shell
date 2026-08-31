import { Gtk } from "ags/gtk3"
import { createComputed } from "gnim"
import Media from "../service/media"
import Audio from "../service/audio"

export function MediaCard() {
  const coverArtCss = createComputed(() => {
    const url = Media.artUrl()
    if (url) {
      return `background-image: url("${url}"); background-size: cover; background-position: center;`
    }
    return ""
  })

  return (
    <box class="MediaPopupCard" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* 1. Media Player Row */}
      <box class="media-player-row" spacing={12} valign={Gtk.Align.CENTER}>
        {/* Album Art (48px) */}
        <box
          class="album-art"
          css={coverArtCss}
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
          hexpand={false}
          vexpand={false}
        >
          <label
            class="fallback-icon"
            label="󰎆"
            visible={createComputed(() => !Media.artUrl())}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
          />
        </box>

        {/* Center: Track Details & Scrub Bar */}
        <box class="media-info" orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand={true}>
          <label
            class="media-title"
            label={Media.title}
            xalign={0}
            ellipsize={3}
            maxWidthChars={24}
          />

          <label
            class="media-artist"
            label={Media.artist}
            xalign={0}
            ellipsize={3}
            maxWidthChars={28}
          />

          <box class="progress-row" spacing={6} valign={Gtk.Align.CENTER}>
            <label class="time-label" label={Media.positionStr} />

            <slider
              class="media-slider"
              hexpand={true}
              value={Media.progress}
              onDragged={({ value }) => Media.setPositionRatio(value)}
            />

            <label class="time-label" label={Media.lengthStr} />
          </box>
        </box>

        {/* Play/Pause Button */}
        <button
          class="play-pause-btn"
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
          onClicked={() => Media.playPause()}
        >
          <label label={Media.playPauseIcon} />
        </button>
      </box>

      {/* 2. Volume Slider Row */}
      <box class="volume-row" spacing={10} valign={Gtk.Align.CENTER}>
        <button
          class="volume-icon-btn"
          valign={Gtk.Align.CENTER}
          onClicked={() => Audio.toggleMute()}
        >
          <label class="icon" label={Audio.icon} />
        </button>

        <slider
          class="volume-slider"
          hexpand={true}
          value={Audio.volumeRatio}
          onDragged={({ value }) => Audio.setVolume(Math.round(value * 100))}
        />

        <label class="volume-text" label={Audio.percentageText} />
      </box>
    </box>
  )
}

export default MediaCard
