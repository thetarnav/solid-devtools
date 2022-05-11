/* @refresh reload */
import { render } from "solid-js/web"

console.log("panel working")

import "./index.css"
import App from "./App"

render(() => <App />, document.getElementById("root")!)
