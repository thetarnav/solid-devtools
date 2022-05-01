/* @refresh reload */
import { render } from "solid-js/web"

console.log(chrome.devtools)

console.log("devtooools page")

import "./index.css"
import App from "./App"

render(() => <App />, document.getElementById("root") as HTMLElement)
