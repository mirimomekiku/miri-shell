import app from "ags/gtk3/app"
import style from "./style.scss"
import ExplorerWindow from "./widget/Window"

app.start({
  css: style,
  main() {
    ExplorerWindow()
  },
})
