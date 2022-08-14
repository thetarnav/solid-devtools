import { render } from "solid-js/web"
import "./state/graph"
import "./state/details"
import "./state/bridge"

import "@solid-devtools/ui/css"

import App from "./App"

render(() => <App />, document.getElementById("root")!)
