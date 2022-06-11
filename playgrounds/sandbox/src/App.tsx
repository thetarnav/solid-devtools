import {
	Component,
	createSignal,
	createEffect,
	createMemo,
	getOwner,
	Show,
	createComputed,
	runWithOwner,
	Setter,
	ParentComponent,
	Accessor,
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

const Spinner: ParentComponent<{ deg: number }> = props => {
	return <div>{props.children}</div>
}

const obj = {
	comp: () => <div>This is an object property component</div>,
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

	let setMe: Setter<string>
	const [smiley, setSmiley] = createSignal<Accessor<string>>()
	// makeTimer(() => setMe(["🙂", "🤔", "🤯"][Math.floor(Math.random() * 3)]), 2000, setInterval)
	createEffect(
		() => {
			const [_smiley, _setMe] = createSignal("🙂", { name: "smiley" })
			setMe = _setMe
			setSmiley(() => _smiley)
			console.log(count())
		},
		undefined,
		{ name: "EFFECT" },
	)

	// createDevtools(getOwner()!)

	return (
		<>
			<h1>Welcome to the Sandbox</h1>
			<div>
				<header>
					<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
					<Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
				</header>
				<div>
					<Show when={showEven()}>{count()} is even!</Show>
				</div>
				<div>
					<Spinner deg={count()}>
						<Show when={showEven()} fallback={<p>\\{smiley()}/</p>}>
							<p style={{ background: "darkgray" }}>{smiley()}</p>
						</Show>
					</Spinner>
				</div>
			</div>
			<obj.comp />
		</>
	)
}

export default App
