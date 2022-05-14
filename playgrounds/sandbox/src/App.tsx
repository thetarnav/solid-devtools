import { Component, createSignal, createEffect, createMemo, getOwner } from "solid-js"
import styles from "./App.module.css"

import { createDevtools } from "solid-devtools-overlay"

const Button = (props: { text: string; onClick: VoidFunction }) => {
	const text = createMemo(() => <span>{props.text}</span>)
	return <button onClick={props.onClick}>{text()}</button>
}

const App: Component = () => {
	const [count, setCount] = createSignal(0, { name: "count_sig" })

	createEffect(
		() => {
			console.log(count())
		},
		undefined,
		{ name: "EFFECT" },
	)

	// createDevtools(getOwner()!)

	return (
		<div class={styles.App}>
			<header class={styles.header}>
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
			</header>
		</div>
	)
}

export default App
