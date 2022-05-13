/* @refresh reload */
import { render } from "solid-js/web"
import { Debugger } from "../../../packages/debugger/src"

import "./index.css"
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
