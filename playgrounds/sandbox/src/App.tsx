import { Component, createSignal, createEffect, createMemo } from "solid-js"

const Button = (props: { text: string; onClick: VoidFunction }) => {
	const text = createMemo(() => <span>{props.text}</span>)
	return (
		<button class="px-3 py-2 bg-orange-300 rounded-2 font-medium" onClick={props.onClick}>
			{text()}
		</button>
	)
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

	return (
		<div class="bg-dark w-screen min-h-screen flex flex-col items-center">
			<header class="flex space-x-3 m-8">
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
				<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
			</header>
		</div>
	)
}

export default App
