import type { Component } from "solid-js"
import { graphs } from "./graph"

import styles from "./App.module.css"

const App: Component = () => {
	return (
		<div class={styles.App}>
			<p class={styles.header}>{JSON.stringify(graphs.graphs)}</p>
		</div>
	)
}

export default App
