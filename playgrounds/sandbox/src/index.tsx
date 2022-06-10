/* @refresh reload */
import { render } from "solid-js/web"
import { Debugger } from "solid-devtools"

import App from "./App"

render(
	() => (
		<Debugger>
			<App />
			{/* <App /> */}
		</Debugger>
	),
	document.getElementById("root") as HTMLElement,
)
