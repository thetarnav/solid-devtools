import { Component } from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { graphs, highlights } from "./graph"
import { HighlightsProvider, OwnerChildren, tw } from "@ui"
import { GraphOwner } from "@shared/graph"

const App: Component = () => {
	return (
		<HighlightsProvider value={highlights}>
			<header class={tw`p-4 bg-gray-100`}>
				<h3>Welcome to Solid Devtools</h3>
				<p>Number of Roots: {Object.keys(graphs).length}</p>
			</header>
			<div>
				<Key each={graphs} by="id">
					{root => <OwnerChildren children={root().children as GraphOwner[]} />}
				</Key>
			</div>
		</HighlightsProvider>
	)
}

export default App
