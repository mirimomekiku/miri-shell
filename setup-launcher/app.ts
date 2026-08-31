import app from "ags/gtk3/app"
import style from "./style.scss"
import SetupWindow from "./widget/SetupWindow"

app.start({
  css: style,
  main() {
    SetupWindow()
  },
})
