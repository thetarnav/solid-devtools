import {
	Component,
	createSignal,
	createEffect,
	createMemo,
	getOwner,
	Show,
	createComputed,
	runWithOwner,
} from "solid-js"

// import { createDevtools } from "solid-devtools-overlay"

const Button = (props: { text: string; onClick: VoidFunction }) => {
	const text = createMemo(() => <span>{props.text}</span>)
	return (
		<button aria-label={props.text} onClick={props.onClick}>
			{text()}
		</button>
	)
}

const App: Component = () => {
	const [count, setCount] = createSignal(0, { name: "count_sig" })
	const [showEven, setShowEven] = createSignal(false)

	createComputed(() => {
		setShowEven(count() % 2 === 0)
	})

	// add signal asynchronously
	const owner = getOwner()!
	setTimeout(() => {
		runWithOwner(owner, () => {
			createSignal("I am here too!", { name: "async" })
		})
	})

	createEffect(
		() => {
			console.log(count())
		},
		undefined,
		{ name: "EFFECT" },
	)

	// createDevtools(getOwner()!)

	return (
		<div>
			<header>
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
			</header>
			<div>
				<Show when={showEven()}>{count()} is even!</Show>
			</div>
		</div>
	)
}

export default App
