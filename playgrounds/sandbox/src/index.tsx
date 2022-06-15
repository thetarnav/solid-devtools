/* @refresh reload */
import { render } from "solid-js/web"
import { Debugger } from "solid-devtools"

import App from "./App"

render(
	() => (
		<Debugger
			locator={{
				targetIDE: "vscode",
			}}
		>
			<App />
		</Debugger>
	),
	document.getElementById("root")!,
)
