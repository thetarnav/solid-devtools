import {
  Component,
  createSignal,
  createEffect,
  createMemo,
  getOwner,
  createComputed,
  Setter,
  ParentComponent,
  createRoot,
} from "solid-js"
import Todos from "./Todos"
import { disposeApp } from "."

const doMediumCalc = () => {
  Array.from({ length: 1000000 }, (_, i) => i).sort(() => Math.random() - 5)
}

let setRootCount: Setter<number>
let disposeOuterRoot: VoidFunction

createRoot(dispose => {
  disposeOuterRoot = dispose

  getOwner()!.name = "OUTSIDE_ROOT"

  const [count, setCount] = createSignal(0)
  setRootCount = setCount

  createEffect(() => {
    count()
    if (count() === 1) {
      createRoot(dispose => {
        getOwner()!.name = "OUTSIDE_TEMP_ROOT"

        createEffect(() => count() === 4 && dispose())

        createRoot(_ => {
          getOwner()!.name = "OUTSIDE_INSIDE_ROOT"
          createEffect(() => count())
        })
      })
    }
  })
})

const Button = (props: { text: string; onClick: VoidFunction }) => {
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
  const [count, setCount] = createSignal(0)
  const [showEven, setShowEven] = createSignal(false)
  const fnSig = createSignal(() => {})
  const nullSig = createSignal(null)
  const symbolSig = createSignal(Symbol("hello-symbol"))

  const objmemo = createMemo(() => {
    return {
      foo: "bar",
      count: count(),
    }
  })

  createComputed(
    _ => {
      const hello = createSignal("hello")
      setShowEven(count() % 2 === 0)
      return count()
    },
    undefined,
    { name: "c-12-3-1-2-3-2-1-1-1-1-1-1-1-0-1-2-1-1-0" },
  )

  return (
    <>
      <h1>Welcome to the Sandbox</h1>
      <div>
        <header>
          <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
          <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
        </header>
        <br />
        <div>{/* <Show when={showEven()}>{count()} is even!</Show> */}</div>
        <p>Dispose application</p>
        <button onClick={() => disposeApp()}>Dispose</button>
        {/* <div>
					<PassChildren>
						<Show when={showEven()} fallback={<p>\\{smiley()}/</p>}>
							<p style={{ background: "darkgray" }}>{smiley()}</p>
						</Show>
					</PassChildren>
				</div> */}
      </div>
      <obj.comp />
      <button onClick={() => setRootCount(p => ++p)}>Update root count</button>
      <button onClick={() => disposeOuterRoot()}>Dispose OUTSIDE_ROOT</button>
      <Article />
      <Todos />
    </>
  )
}

export default App
