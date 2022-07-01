/* @refresh reload */
import { render } from "solid-js/web"
import { useLocatorPlugin } from "solid-devtools"

import App from "./App"

useLocatorPlugin({
	targetIDE: "vscode",
})

export const disposeApp = render(
	() => (
		// <Debugger>
		<App />
		// </Debugger>
	),
	document.getElementById("root")!,
)
