import { reattachOwner } from "solid-devtools"
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
	createRoot,
} from "solid-js"
import Todos from "./Todos"

const Button = (props: { text: string; onClick: VoidFunction }) => {
	createRoot(dispose => {
		reattachOwner()
		createComputed(() => {}, undefined, { name: "HEYYY, I should BE DEAD" })
		setTimeout(dispose, 2000)
	})

	const text = createMemo(() => <span>{props.text}</span>)
	return (
		<button aria-label={props.text} onClick={props.onClick}>
			{text()}
		</button>
	)
}

const PassChildren: ParentComponent = props => {
	return props.children
}

const Article: Component = () => {
	return (
		<article>
			<h3>A cool headline for testing :)</h3>
			<p>
				Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dolorem odio culpa vel vitae? Quis
				deleniti soluta rem velit necessitatibus?{" "}
				<PassChildren>
					<b>
						Saepe nulla omnis nobis minima perferendis odio doloremque deleniti dolore corrupti.
					</b>
				</PassChildren>
			</p>
		</article>
	)
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

	setTimeout(() => {
		createRoot(dispose => {
			reattachOwner()
			createComputed(() => {}, undefined, { name: "Async Root" })
			setTimeout(dispose, 2000)
		}, owner)
	}, 4000)

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
					<PassChildren>
						<Show when={showEven()} fallback={<p>\\{smiley()}/</p>}>
							<p style={{ background: "darkgray" }}>{smiley()}</p>
						</Show>
					</PassChildren>
				</div>
			</div>
			<obj.comp />
			<Article />
			<Todos />
		</>
	)
}

export default App
