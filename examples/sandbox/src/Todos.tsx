import { createSignal, batch, For, Component } from 'solid-js'
import { createStore, Store, SetStoreFunction, produce, unwrap } from 'solid-js/store'
// import { isSolidMemo } from "@solid-devtools/debugger"

export function createLocalStore<T extends object>(
  name: string,
  init: T,
): [Store<T>, SetStoreFunction<T>] {
  // const localState = localStorage.getItem(name)
  const localState = undefined
  const [state, setState] = createStore<T>(localState ? JSON.parse(localState) : init, { name })
  // createEffect(() => localStorage.setItem(name, JSON.stringify(state)))
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
  // console.log(isSolidMemo(getOwner()!.owner))

  // debugProps(props)

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

  const [valuesInASignal] = createSignal({ values: todos.values })

  // @ts-ignore
  setTodos('other', 'else', unwrap(todos.values))

  setTimeout(() => {
    setTodos('other', 'countOuter', p => ({
      ...p,
      countInner: undefined,
    }))
  })

  const [count, setCount] = createStore(todos.other.countOuter.countInner)
  const intervalId = setInterval(() => {
    const newCount = count.count + 1
    batch(() => {
      if (newCount === 5) {
        setTodos('other', 'countOuter', 'countInner', unwrap(count))
        setTodos('other', 'name', 'todos-2')
      }
      setCount('count', newCount)
    })
    if (newCount === 5) {
      console.log('AFTER BATCH')
    }
    if (newCount === 8) {
      clearInterval(intervalId)
    }
  }, 1000)

  // makeStoreObserver(todos, console.log)

  // debugStore(todos)

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
  // 	setTodos(
  // 		0,
  // 		reconcile({
  // 			title: "Learn Solid-JS",
  // 			done: false,
  // 			[Math.random() + ""]: "hello",
  // 		}),
  // 	)
  // }, 1000)

  return (
    <>
      <h3>Simple Todos Example</h3>
      <form onSubmit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={todos.other.newTitle.value}
          onInput={e => setTitle(e.currentTarget.value)}
        />
        <button>+</button>
      </form>
      <For each={todos.values}>
        {(todo, i) => (
          <Todo
            {...todo}
            onCheck={v => setTodos('values', i(), 'done', v)}
            onUpdate={v => setTodos('values', i(), 'title', v)}
            // onRemove={() => setTodos('values', t => removeIndex(t, i()))}
            onRemove={() =>
              setTodos(
                'values',
                produce(t => t.splice(i(), 1)),
              )
            }
          />
        )}
      </For>
    </>
  )
}
export default Todos
