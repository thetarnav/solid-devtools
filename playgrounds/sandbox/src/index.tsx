/* @refresh reload */
import { render } from "solid-js/web"
import { Devtools } from "../../../packages/library/src"

import "./index.css"
import App from "./App"

render(
	() => (
		<Devtools>
			<App />
			<App />
		</Devtools>
	),
	document.getElementById("root") as HTMLElement,
)
