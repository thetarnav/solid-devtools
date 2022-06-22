import { createEffect, createSignal, batch, For, Component } from "solid-js"
import { createStore, SetStoreFunction, Store } from "solid-js/store"
import { reattachOwner } from "solid-devtools"

export function createLocalStore<T extends object>(
	name: string,
	init: T,
): [Store<T>, SetStoreFunction<T>] {
	const localState = localStorage.getItem(name)
	const [state, setState] = createStore<T>(localState ? JSON.parse(localState) : init)
	createEffect(() => localStorage.setItem(name, JSON.stringify(state)))
	return [state, setState]
}

export function removeIndex<T>(array: readonly T[], index: number): T[] {
	return [...array.slice(0, index), ...array.slice(index + 1)]
}

type TodoItem = { title: string; done: boolean }

const Todo: Component<{
	done: boolean
	title: string
	onCheck: (value: boolean) => void
	onUpdate: (value: string) => void
	onRemove: VoidFunction
}> = props => {
	return (
		<div>
			<input
				type="checkbox"
				checked={props.done}
				onChange={e => props.onCheck(e.currentTarget.checked)}
			/>
			<input
				type="text"
				value={props.title}
				onChange={e => props.onUpdate(e.currentTarget.value)}
			/>
			<button onClick={props.onRemove}>x</button>
		</div>
	)
}

const Todos: Component = () => {
	const [newTitle, setTitle] = createSignal("")
	const [todos, setTodos] = createLocalStore<TodoItem[]>("todos", [])

	const addTodo = (e: SubmitEvent) => {
		e.preventDefault()
		batch(() => {
			setTodos(todos.length, {
				title: newTitle(),
				done: false,
			})
			setTitle("")
		})
	}

	return (
		<>
			<h3>Simple Todos Example</h3>
			<form onSubmit={addTodo}>
				<input
					placeholder="enter todo and click +"
					required
					value={newTitle()}
					onInput={e => setTitle(e.currentTarget.value)}
				/>
				<button>+</button>
			</form>
			<For each={todos}>
				{(todo, i) => {
					// reattachOwner()
					return (
						<Todo
							{...todo}
							onCheck={v => setTodos(i(), "done", v)}
							onUpdate={v => setTodos(i(), "title", v)}
							onRemove={() => setTodos(t => removeIndex(t, i()))}
						/>
					)
				}}
			</For>
		</>
	)
}
export default Todos
