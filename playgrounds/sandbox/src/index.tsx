/* @refresh reload */
import { render } from "solid-js/web"
import { useLocatorPlugin } from "solid-devtools"
import { Observable } from "object-observer"

window["$sdt_wrapStore"] = obj => {
	console.log("storeCreated")
	const observed = Observable.from(obj)
	Observable.observe(observed, changes => {
		changes.forEach(change => {
			console.log(change)
		})
	})
	return observed
}

import App from "./App"

useLocatorPlugin({
	targetIDE: "vscode",
})

export const disposeApp = render(() => <App />, document.getElementById("root")!)
