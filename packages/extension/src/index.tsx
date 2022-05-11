/* @refresh reload */
import { render } from "solid-js/web"

console.log("panel working")

import "virtual:windi.css"
import App from "./App"

render(() => <App />, document.getElementById("root")!)
