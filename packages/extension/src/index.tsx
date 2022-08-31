import { render } from "solid-js/web"
import "./state/selected"
import "./state/graph"
import "./state/details"
import "./bridge"

import "@solid-devtools/ui/css"

import App from "./App"

render(() => <App />, document.getElementById("root")!)
