import type { Component } from "solid-js"
import { graphs } from "./graph"

const App: Component = () => {
	return <div>{JSON.stringify(graphs.graphs)}</div>
}

export default App
