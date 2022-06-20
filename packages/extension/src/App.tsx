import { Component, For } from "solid-js"
import { graphs, highlights } from "./graph"
import { HighlightsProvider, OwnerNode, tw } from "@solid-devtools/ui"

const App: Component = () => {
	return (
		<HighlightsProvider value={highlights}>
			<header class={tw`p-4 bg-gray-100`}>
				<h3>Welcome to Solid Devtools</h3>
				<p>Number of Roots: {Object.keys(graphs).length}</p>
			</header>
			<div>
				<For each={graphs}>{root => <OwnerNode owner={root.tree} />}</For>
			</div>
		</HighlightsProvider>
	)
}

export default App
