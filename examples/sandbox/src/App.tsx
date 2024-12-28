import * as s from 'solid-js'
import {createMutable} from 'solid-js/store'
import * as sweb from 'solid-js/web'
import Recursive from './Recursive.tsx'
import {ThemeExample} from './Theme.tsx'

import Todos from './Todos.tsx'
// const Todos = s.lazy(() => import('./Todos.tsx'))

const doMediumCalc = () => {
    Array.from({length: 1000000}, (_, i) => i).sort(() => Math.random() - 5)
}

let setRootCount: s.Setter<number>
let disposeOuterRoot: VoidFunction

s.createRoot(dispose => {
    disposeOuterRoot = dispose

    const [count, setCount] = s.createSignal(0)
    setRootCount = setCount

    function createEffectInRoot(dispose: VoidFunction) {
        s.createEffect(() => count() === 4 && dispose(), undefined, {})

        s.createRoot(_ => {
            s.createEffect(() => count())
        })
    }

    s.createEffect(() => {
        count()
        if (count() === 1) {
            s.createRoot(createEffectInRoot)
        }
    }, undefined)
})

const Button = (props: {text: string; onClick: VoidFunction}) => {
    const text = s.createMemo(() => <span>{props.text}</span>)
    return (
        <button aria-label={props.text} onClick={props.onClick}>
            {text()}
        </button>
    )
}

const PassChildren: s.ParentComponent = props => props.children

const Article: s.Component = () => {

    const state = createMutable({
        count: 0,
        other: {name: 'article'},
        content: {
            title: 'A cool headline for testing :)',
            body: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dolorem odio culpa vel vitae? Quis deleniti soluta rem velit necessitatibus? ',
        },
    })
    ;(state as any).circular = state

    const [data] = s.createResource(
        () => state.count,
        async c => {
            await new Promise(r => setTimeout(r, 1000))
            return `Article ${c}`
        },
        {name: 'resource'},
    )

    return (
        <article>
            <h3>{state.content.title}</h3>
            <p>
                {state.content.body}
                <b>
                    Saepe nulla omnis nobis minima perferendis odio doloremque deleniti dolore
                    corrupti.
                </b>
            </p>
            {/* <p>Count: {state.count}</p> */}
            <s.Suspense>
                <p>
                    <PassChildren>
                        <button onClick={() => state.count++}>Increment {data()}</button>
                    </PassChildren>
                </p>
            </s.Suspense>
        </article>
    )
}

const DynamicSpreadParent = () => {
    const [props, setProps] = s.createSignal<any>({
        a: 1,
        b: 2,
        c: 3,
        style: {width: '160px', height: '30px', background: '#fcb', color: 'black'},
        textContent: 'Before Change',
        onclick: () =>
            setProps({
                style: {width: '160px', height: '30px', background: '#eba', color: 'black'},
                textContent: 'After Change',
                d: 4,
                e: 5,
            }),
    })
    const DynamicSpreadChild = (props: any) => <div {...props} />
    return <DynamicSpreadChild {...props()} />
}

const Broken: s.Component = () => {
    throw new Error('Oh No')
}

const createComponent = (content: () => s.JSX.Element) => {
    const Content = () => <div>{content()}</div>
    return Content
}

const App: s.Component = () => {
    const [count, setCount] = s.createSignal(0)
    const [showEven, setShowEven] = s.createSignal(false)
    const fnSig = s.createSignal({fn: () => {}}, {equals: (a, b) => a.fn === b.fn})
    const nullSig = s.createSignal(null)
    const symbolSig = s.createSignal(Symbol('hello-symbol'))
    const [header, setHeader] = s.createSignal(
        <h1 onClick={() => setHeader(<h1>Call that an easter egg</h1>)}>Welcome to the Sandbox</h1>,
    )

    // setInterval(() => {
    //   setCount(count() + 1)
    // }, 2000)

    const objmemo = s.createMemo(() => {
        return {
            foo: 'bar',
            count: count(),
            get subheader() {
                return <h2>Subheader</h2>
            },
        }
    })

    s.createComputed(_ => {
        const hello = s.createSignal('hello')
        setShowEven(count() % 3 === 0)
        return count()
    },  undefined, {name: 'very-long-name-that-will-definitely-not-have-enough-space-to-render'})

    s.createComputed(() => {}, undefined, {name: 'frozen'})
    s.createRenderEffect(() => {})

    const Bold: s.ParentComponent = props => <b>{props.children}</b>

    const BoldWrapper = createComponent(() => <Bold>{count()} is even!</Bold>)

    const [showBroken, setShowBroken] = s.createSignal(false)

    return (
        <>
            {header()}
            {objmemo().subheader}
            <div>
                <header>
                    <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
                    <Button onClick={() => setCount(p => ++p)} text={`Count: ${count()}`} />
                </header>
                <sweb.Dynamic
                    component='div'
                    style={{height: '1rem', 'margin-top': '1rem'}}
                >
                    <s.Show when={showEven()}>
                    {s.createComponent(() => <>
                        <BoldWrapper/>
                    </>, {})}
                    </s.Show>
                </sweb.Dynamic>
                {/* <button onClick={() => disposeApp()}>Dispose whole application</button>
                <br /> */}
                <button onClick={() => setShowBroken(p => !p)}>
                    {showBroken() ? 'Hide' : 'Show'} broken component.
                </button>
                <s.ErrorBoundary
                    fallback={(err, reset) => <>
                        {err.toString()}
                        <button
                            onClick={() => {
                                setShowBroken(false)
                                reset()
                            }}
                        >
                            Reset
                        </button>
                    </>}
                >
                    <s.Show when={showBroken()}>
                        <Broken />
                    </s.Show>
                </s.ErrorBoundary>
                <br />
                <br />
            </div>
            <DynamicSpreadParent />
            <button onClick={() => setRootCount(p => ++p)}>Update root count</button>
            <button onClick={() => disposeOuterRoot()}>Dispose OUTSIDE_ROOT</button>
            <Article />
            <Todos title='Simple Todos Example' />
            {s.untrack(() => {
                const MARGIN = '24px'
                return <>
                    <div style={{margin: MARGIN}}>
                        <CountingComponent />
                    </div>
                    <div style={{margin: MARGIN}}>
                        <ThemeExample />
                    </div>
                </>
            })}
            <Recursive />
        </>
    )
}

const CountingComponent = () => {
    const [count, setCount] = s.createSignal(0)
    // const interval = setInterval(() => setCount(c => c + 1), 1000)
    // onCleanup(() => clearInterval(interval))
    return <div>Count value is {count()}</div>
}

export default App
