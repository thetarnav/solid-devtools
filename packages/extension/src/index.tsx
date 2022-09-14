import { render } from "solid-js/web"
import "./state/selected"
import "./state/structure"
import "./state/inspector"
import "./bridge"

import App from "./App"

render(() => <App />, document.getElementById("root")!)
