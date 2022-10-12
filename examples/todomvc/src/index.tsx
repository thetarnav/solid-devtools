import { createMemo, For, JSX, onCleanup, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { createLocalStore } from './utils'
import { Debugger } from '../../../packages/debugger/src'

const ESCAPE_KEY = 27
const ENTER_KEY = 13

type TodoItem = {
  title: string
  completed: boolean
  id: number
}

const TodoApp = () => {
  const [state, setState] = createLocalStore('solid-todomvc-store', {
      counter: 1,
      todos: [] as TodoItem[],
      showMode: 'all',
      editingTodoId: null as number | null,
    }),
    remainingCount = createMemo(
      () => state.todos.length - state.todos.filter(todo => todo.completed).length,
    ),
    filterList = (todos: TodoItem[]) => {
      if (state.showMode === 'active') return todos.filter(todo => !todo.completed)
      else if (state.showMode === 'completed') return todos.filter(todo => todo.completed)
      else return todos
    },
    removeTodo = (todoId: number) => setState('todos', t => t.filter(item => item.id !== todoId)),
    editTodo = (todo: Partial<TodoItem>) => setState('todos', item => item.id === todo.id, todo),
    clearCompleted = () => setState('todos', t => t.filter(todo => !todo.completed)),
    toggleAll = (completed: boolean) =>
      setState('todos', todo => todo.completed !== completed, { completed }),
    setEditing = (todoId: number | null) => setState('editingTodoId', todoId),
    addTodo: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = ({ currentTarget, keyCode }) => {
      const title = currentTarget.value.trim()
      if (keyCode === ENTER_KEY && title) {
        setState({
          todos: [{ title, id: state.counter, completed: false }, ...state.todos],
          counter: state.counter + 1,
        })
        currentTarget.value = ''
      }
    },
    save = (todoId: number, title: string) => {
      title = title.trim()
      if (state.editingTodoId === todoId && title) {
        editTodo({ id: todoId, title })
        setEditing(null)
      }
    },
    toggle = (todoId: number, checked: boolean) => editTodo({ id: todoId, completed: checked }),
    doneEditing = (todoId: number, keyCode: number, title: string) => {
      if (keyCode === ENTER_KEY) save(todoId, title)
      else if (keyCode === ESCAPE_KEY) setEditing(null)
    }

  const locationHandler = () => setState('showMode', location.hash.slice(2) || 'all')
  window.addEventListener('hashchange', locationHandler)
  onCleanup(() => window.removeEventListener('hashchange', locationHandler))

  return (
    <section class="todoapp">
      <header class="header">
        <h1>todos</h1>
        <input class="new-todo" placeholder="What needs to be done?" onKeyDown={addTodo} />
      </header>

      <Show when={state.todos.length > 0}>
        <section class="main">
          <input
            id="toggle-all"
            class="toggle-all"
            type="checkbox"
            checked={!remainingCount()}
            onInput={({ currentTarget: { checked } }) => toggleAll(checked)}
          />
          <label for="toggle-all" />
          <ul class="todo-list">
            <For each={filterList(state.todos)}>
              {todo => (
                <li
                  class="todo"
                  classList={{
                    editing: state.editingTodoId === todo.id,
                    completed: todo.completed,
                  }}
                >
                  <div class="view">
                    <input
                      class="toggle"
                      type="checkbox"
                      checked={todo.completed}
                      onInput={e => toggle(todo.id, e.currentTarget.checked)}
                    />
                    <label onDblClick={[setEditing, todo.id]}>{todo.title}</label>
                    <button class="destroy" onClick={[removeTodo, todo.id]} />
                  </div>
                  <Show when={state.editingTodoId === todo.id}>
                    <input
                      class="edit"
                      value={todo.title}
                      onFocusOut={e => save(todo.id, e.currentTarget.value)}
                      onKeyUp={e => doneEditing(todo.id, e.keyCode, e.currentTarget.value)}
                      ref={el => setTimeout(() => el.focus())}
                    />
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </section>

        <footer class="footer">
          <span class="todo-count">
            <strong>{remainingCount()}</strong> {remainingCount() === 1 ? ' item ' : ' items '} left
          </span>
          <ul class="filters">
            <li>
              <a href="#/" classList={{ selected: state.showMode === 'all' }}>
                All
              </a>
            </li>
            <li>
              <a href="#/active" classList={{ selected: state.showMode === 'active' }}>
                Active
              </a>
            </li>
            <li>
              <a href="#/completed" classList={{ selected: state.showMode === 'completed' }}>
                Completed
              </a>
            </li>
          </ul>
          <Show when={remainingCount() !== state.todos.length}>
            <button class="clear-completed" onClick={clearCompleted}>
              Clear completed
            </button>
          </Show>
        </footer>
      </Show>
    </section>
  )
}

render(
  () => (
    <Debugger>
      <TodoApp />
    </Debugger>
  ),
  document.getElementById('main')!,
)
