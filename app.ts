import app from "ags/gtk3/app"
import style from "./style.scss"
import Bar from "./widget/Bar"
import MediaPopup from "./widget/MediaPopup"

app.start({
  css: style,
  main() {
    app.get_monitors().map((monitor) => {
      Bar(monitor)
      MediaPopup(monitor)
    })
  },
})
