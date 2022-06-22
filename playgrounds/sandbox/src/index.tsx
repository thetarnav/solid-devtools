/* @refresh reload */
import { render } from "solid-js/web"
import { Debugger, useLocatorPlugin } from "solid-devtools"

import App from "./App"

useLocatorPlugin({
	targetIDE: "vscode",
})

render(
	() => (
		<Debugger>
			<App />
		</Debugger>
	),
	document.getElementById("root")!,
)
