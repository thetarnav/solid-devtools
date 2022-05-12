import { Component, For } from "solid-js"
import { graphs } from "./graph"
import { OwnerNode } from "@ui"

const App: Component = () => {
	return (
		<>
			<div class="bg-gray-100">
				<For each={graphs.graphs}>{graph => <OwnerNode owner={graph} />}</For>
			</div>
			<p class="text-blueGray">Hello, {graphs.graphs.length}</p>
		</>
	)
}

export default App
