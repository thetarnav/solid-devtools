/* @refresh reload */
import {
  Component,
  createComponent,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createResource,
  createRoot,
  createSignal,
  ErrorBoundary,
  ParentComponent,
  Setter,
  Show,
  Suspense,
} from 'solid-js'
import { createMutable } from 'solid-js/store'
import { disposeApp } from '.'
import Recursive from './Recursive'
import { ThemeExample } from './Theme'
import Todos from './Todos'

const doMediumCalc = () => {
  Array.from({ length: 1000000 }, (_, i) => i).sort(() => Math.random() - 5)
}

let setRootCount: Setter<number>
let disposeOuterRoot: VoidFunction

createRoot(dispose => {
  disposeOuterRoot = dispose

  const [count, setCount] = createSignal(0)
  setRootCount = setCount

  function createEffectInRoot(dispose: VoidFunction) {
    createEffect(() => count() === 4 && dispose(), undefined, {})

    createRoot(_ => {
      createEffect(() => count())
    })
  }

  createEffect(() => {
    count()
    if (count() === 1) {
      createRoot(createEffectInRoot)
    }
  }, undefined)
})

const Button = (props: { text: string; onClick: VoidFunction }) => {
  const text = createMemo(() => <span>{props.text}</span>)
  return (
    <button aria-label={props.text} onClick={props.onClick}>
      {text()}
    </button>
  )
}

const PassChildren: ParentComponent = props => props.children

const Article: Component = () => {
  const state = createMutable({
    count: 0,
    other: { name: 'article' },
    content: {
      title: 'A cool headline for testing :)',
      body: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dolorem odio culpa vel vitae? Quis deleniti soluta rem velit necessitatibus? ',
    },
  })
  ;(state as any).circular = state

  const [data] = createResource(
    () => state.count,
    async c => {
      await new Promise(r => setTimeout(r, 1000))
      return `Article ${c}`
    },
    { name: 'resource' },
  )

  return (
    <article>
      <h3>{state.content.title}</h3>
      <p>
        {state.content.body}
        <b>Saepe nulla omnis nobis minima perferendis odio doloremque deleniti dolore corrupti.</b>
      </p>
      {/* <p>Count: {state.count}</p> */}
      <Suspense>
        <p>
          <PassChildren>
            <button onClick={() => state.count++}>Increment {data()}</button>
          </PassChildren>
        </p>
      </Suspense>
    </article>
  )
}

const DynamicSpreadParent = () => {
  const [props, setProps] = createSignal<any>({
    a: 1,
    b: 2,
    c: 3,
    style: { width: '160px', height: '30px', background: '#fcb', color: 'black' },
    textContent: 'Before Change',
    onclick: () =>
      setProps({
        style: { width: '160px', height: '30px', background: '#eba', color: 'black' },
        textContent: 'After Change',
        d: 4,
        e: 5,
      }),
  })
  const DynamicSpreadChild = (props: any) => <div {...props} />
  return <DynamicSpreadChild {...props()} />
}

const Broken: Component = () => {
  throw new Error('Oh No')
}

const App: Component = () => {
  const [count, setCount] = createSignal(0)
  const [showEven, setShowEven] = createSignal(false)
  const fnSig = createSignal({ fn: () => {} }, { equals: (a, b) => a.fn === b.fn })
  const nullSig = createSignal(null)
  const symbolSig = createSignal(Symbol('hello-symbol'))
  const [header, setHeader] = createSignal(
    <h1 onClick={() => setHeader(<h1>Call that an easter egg</h1>)}>Welcome to the Sandbox</h1>,
  )

  // setInterval(() => {
  //   setCount(count() + 1)
  // }, 2000)

  const objmemo = createMemo(() => {
    return {
      foo: 'bar',
      count: count(),
      get subheader() {
        return <h2>Subheader</h2>
      },
    }
  })

  createComputed(
    _ => {
      const hello = createSignal('hello')
      setShowEven(count() % 3 === 0)
      return count()
    },
    undefined,
    { name: 'very-long-name-that-will-definitely-not-have-enough-space-to-render' },
  )

  createComputed(() => {}, undefined, { name: 'frozen' })
  createRenderEffect(() => {})

  const Bold: ParentComponent = props => <b>{props.children}</b>

  const [showBroken, setShowBroken] = createSignal(false)

  return (
    <>
      {header()}
      {objmemo().subheader}
      <div>
        <header>
          <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
          <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
        </header>
        <div style={{ height: '1rem', 'margin-top': '1rem' }}>
          <Show when={showEven()}>
            {createComponent(() => {
              return <Bold>{count()} is even!</Bold>
            }, {})}
          </Show>
        </div>
        <button onClick={() => disposeApp()}>Dispose whole application</button>
        <br />
        <button onClick={() => setShowBroken(p => !p)}>
          {showBroken() ? 'Hide' : 'Show'} broken component.
        </button>
        <ErrorBoundary
          fallback={(err, reset) => (
            <>
              {err.toString()}
              <button
                onClick={() => {
                  setShowBroken(false)
                  reset()
                }}
              >
                Reset
              </button>
            </>
          )}
        >
          <Show when={showBroken()}>
            <Broken />
          </Show>
        </ErrorBoundary>
        <br />
        <br />
      </div>
      <DynamicSpreadParent />
      <button onClick={() => setRootCount(p => ++p)}>Update root count</button>
      <button onClick={() => disposeOuterRoot()}>Dispose OUTSIDE_ROOT</button>
      <Article />
      <Todos />
      <div style={{ margin: '24px' }}>
        <CountingComponent />
      </div>
      <div style={{ margin: '24px' }}>
        <ThemeExample />
      </div>
      <Recursive />
    </>
  )
}

const CountingComponent = () => {
  const [count, setCount] = createSignal(0)
  // const interval = setInterval(() => setCount(c => c + 1), 1000)
  // onCleanup(() => clearInterval(interval))
  return <div>Count value is {count()}</div>
}

export default App
