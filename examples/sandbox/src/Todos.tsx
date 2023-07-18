import {
    batch,
    Component,
    createEffect,
    createMemo,
    createRoot,
    createSignal,
    For,
    Show,
} from 'solid-js'
import { createStore, produce, SetStoreFunction, Store, unwrap } from 'solid-js/store'

export function createLocalStore<T extends object>(
    name: string,
    init: T,
): [Store<T>, SetStoreFunction<T>] {
    const localState = localStorage.getItem(name)
    // const localState = undefined
    const [state, setState] = createStore<T>(localState ? JSON.parse(localState) : init, { name })
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
    const [newTitle, setTitle] = createSignal('')
    const [todos, setTodos] = createLocalStore('todos-2', {
        values: [] as TodoItem[],
        other: {
            name: 'todos',
            get newTitle() {
                return { value: newTitle() }
            },
            countOuter: {
                countInner: {
                    count: 0,
                },
            },
        },
    })

    const valuesInASignal = createMemo(() => ({ values: todos.values }))

    // @ts-ignore
    setTodos('other', 'else', unwrap(todos.values))

    const addTodo = (e: SubmitEvent) => {
        e.preventDefault()
        batch(() => {
            setTodos('values', todos.values.length, {
                title: newTitle(),
                done: false,
            })
            setTitle('')
        })
    }

    // setTimeout(() => {
    //   setTodos(
    //     'values',
    //     0,
    //     reconcile({
    //       title: 'Learn Solid-JS',
    //       done: false,
    //       [Math.random() + '']: 'hello',
    //     }),
    //   )
    // }, 1000)

    return (
        <>
            <h3>Simple Todos Example</h3>
            <Show when={true} keyed>
                {v => {
                    createRoot(d => {
                        createEffect(newTitle, undefined, { name: 'newTitle effect' })
                    })
                    return (
                        <form onSubmit={addTodo}>
                            <input
                                placeholder="enter todo and click +"
                                required
                                value={newTitle()}
                                onInput={e => setTitle(e.currentTarget.value)}
                            />
                            <button>+</button>
                        </form>
                    )
                }}
            </Show>
            <For each={todos.values}>
                {(todo, i) => {
                    createEffect(i, undefined, { name: 'todo index' })
                    return (
                        <Todo
                            {...todo}
                            onCheck={v => setTodos('values', i(), 'done', v)}
                            onUpdate={v => setTodos('values', i(), 'title', v)}
                            onRemove={() =>
                                setTodos(
                                    'values',
                                    produce(t => t.splice(i(), 1)),
                                )
                            }
                        />
                    )
                }}
            </For>
        </>
    )
}
export default Todos
