import * as s from 'solid-js'
import {createStore, produce, type SetStoreFunction, type Store, unwrap} from 'solid-js/store'

export function createLocalStore<T extends object>(
    name: string,
    init: T,
): [Store<T>, SetStoreFunction<T>] {
    const localState = localStorage.getItem(name)
    // const localState = undefined
    const [state, setState] = createStore<T>(
        localState ? JSON.parse(localState) as any : init, {name}
    )
    s.createEffect(() => localStorage.setItem(name, JSON.stringify(state)))
    return [state, setState]
}

export function removeIndex<T>(array: readonly T[], index: number): T[] {
    return [...array.slice(0, index), ...array.slice(index + 1)]
}

type TodoItem = {title: string; done: boolean}

const Todo: s.Component<{
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
                aria-label={props.title}
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

const Todos: s.Component<{title: string}> = (props) => {
    console.log(s.getOwner())

    const [newTitle, setTitle] = s.createSignal('')
    const [todos, setTodos] = createLocalStore('todos-2', {
        values: [] as TodoItem[],
        other: {
            name: 'todos',
            get newTitle() {
                return {value: newTitle()}
            },
            countOuter: {
                countInner: {
                    count: 0,
                },
            },
        },
    })

    const valuesInASignal = s.createMemo(() => ({values: todos.values}))

    // @ts-ignore
    setTodos('other', 'else', unwrap(todos.values))

    const addTodo = (e: SubmitEvent) => {
        e.preventDefault()
        s.batch(() => {
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
            <h3>{props.title}</h3>
            <s.Show when={true} keyed>
            {v => {
                s.createRoot(d => {
                    s.createEffect(newTitle, undefined, {name: 'newTitle effect'})
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
            </s.Show>
            <s.For each={todos.values}>
            {(todo, i) => {
                s.createEffect(i, undefined, {name: 'todo index'})
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
            </s.For>
        </>
    )
}
export default Todos
