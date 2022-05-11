import { Component, For } from "solid-js"
import { graphs } from "./graph"
import { OwnerNode } from "solid-devtools-ui"

const App: Component = () => {
	return (
		<div>
			<For each={graphs.graphs}>{graph => <OwnerNode owner={graph} />}</For>
		</div>
	)
}

export default App
