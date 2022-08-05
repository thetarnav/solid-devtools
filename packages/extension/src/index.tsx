/* @refresh reload */
import { render } from "solid-js/web"
import { sheet } from "./twind"

console.log("panel working")

document.adoptedStyleSheets = [sheet.target]

import App from "./App"

render(() => <App />, document.getElementById("root")!)
