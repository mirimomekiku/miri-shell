import app from "ags/gtk3/app"
import style from "./style.scss"
import SpotlightModal from "./widget/Spotlight"

app.start({
  css: style,
  main() {
    SpotlightModal()
  },
})
