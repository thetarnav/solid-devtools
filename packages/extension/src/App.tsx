import { Component, For } from "solid-js"
import { graphs } from "./graph"
import { OwnerNode, tw } from "@ui"

const App: Component = () => {
	return (
		<>
			<header class={tw`p-4 bg-gray-100`}>
				<h3>Welcome to Solid Devtools</h3>
				<p>Number of Roots: {graphs.graphs.length}</p>
			</header>
			<div>
				<For each={graphs.graphs}>{graph => <OwnerNode owner={graph} />}</For>
			</div>
		</>
	)
}

export default App
