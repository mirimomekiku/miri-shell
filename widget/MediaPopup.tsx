import app from "ags/gtk3/app"
import { Astal, Gtk, Gdk } from "ags/gtk3"
import { createComputed } from "gnim"
import Media from "../service/media"

export default function MediaPopup(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor

  const coverArtCss = createComputed(() => {
    const url = Media.artUrl()
    if (url) {
      return `background-image: url("${url}"); background-size: cover; background-position: center;`
    }
    return ""
  })

  return (
    <window
      class="MediaPopupWindow"
      gdkmonitor={gdkmonitor}
      anchor={TOP}
      visible={Media.isOpen}
      application={app}
    >
      <box class="MediaPopupCard" spacing={14} valign={Gtk.Align.CENTER}>
        {/* Left: Album Cover */}
        <box
          class="album-art"
          css={coverArtCss}
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
        >
          {createComputed(() =>
            !Media.artUrl() ? (
              <label class="fallback-icon" label="󰎆" />
            ) : null
          )}
        </box>

        {/* Center: Track Details & Progress Slider */}
        <box class="media-info" orientation={Gtk.Orientation.VERTICAL} spacing={3} hexpand={true}>
          {/* Track Title */}
          <label
            class="media-title"
            label={Media.title}
            xalign={0}
            ellipsize={3}
            maxWidthChars={26}
          />

          {/* Artist Name */}
          <label
            class="media-artist"
            label={Media.artist}
            xalign={0}
            ellipsize={3}
            maxWidthChars={30}
          />

          {/* Progress Row (Elapsed -- Slider -- Total) */}
          <box class="progress-row" spacing={8} valign={Gtk.Align.CENTER}>
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

        {/* Right: Circular Play/Pause Action Button */}
        <button
          class="play-pause-btn"
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
          onClicked={() => Media.playPause()}
        >
          <label label={Media.playPauseIcon} />
        </button>
      </box>
    </window>
  )
}
