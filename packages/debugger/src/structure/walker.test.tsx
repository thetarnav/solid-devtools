import '../setup.ts'

import * as s from 'solid-js'
import * as test from 'vitest'
import {$setSdtId} from '../main/id.ts'
import {dom_element_interface, NodeType, TreeWalkerMode, type Mapped, type Solid} from '../main/types.ts'
import * as walker from './walker.ts'
import setup from '../main/setup.ts'
import {initRoots} from '../main/roots.ts'

test.beforeAll(() => {
    initRoots()
})

let eli = dom_element_interface

test.describe('TreeWalkerMode.Owners', () => {
    test.it('default options', () => {
        {
            let registry = walker.makeComponentRegistry(eli)

            const [dispose, owner] = s.createRoot(_dispose => {

                const [source] = s.createSignal('foo', {name: 's0'})
                s.createSignal('hello', {name: 's1'})

                s.createEffect(() => {
                    s.createSignal({bar: 'baz'}, {name: 's2'})
                    s.createComputed(source, undefined, {name: 'c0'})
                    s.createComputed(() => {
                        s.createSignal(0, {name: 's3'})
                    }, undefined, {name: 'c1'})
                }, undefined, {name: 'e0'})

                return [_dispose, setup.solid.getOwner()! as Solid.Root]
            })

            const tree = walker.walkSolidTree(owner, {
                onUpdate: () => {
                    /**/
                },
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Owners,
                eli: eli,
                registry: registry,
            })

            dispose()

            test.expect(tree).toEqual({
                id: '#ff',
                type: NodeType.Root,
                children: [
                    {
                        id: test.expect.any(String),
                        name: 'e0',
                        type: NodeType.Effect,
                        frozen: true,
                        children: [
                            {
                                id: test.expect.any(String),
                                name: 'c0',
                                type: NodeType.Computation,
                                children: [],
                            },
                            {
                                id: test.expect.any(String),
                                name: 'c1',
                                type: NodeType.Computation,
                                frozen: true,
                                children: [],
                            },
                        ],
                    },
                ],
            } satisfies Mapped.Owner)
            test.expect(tree, 'is json serializable').toEqual(JSON.parse(JSON.stringify(tree)))
        }

        {
            let registry = walker.makeComponentRegistry(eli)

            s.createRoot(dispose => {
                const [source] = s.createSignal(0, {name: 'source'})

                const div = document.createElement('div')

                s.createComputed(
                    () => {
                        const focused = s.createMemo(
                            () => {
                                source()
                                s.createSignal(div, {name: 'element'})
                                const memo = s.createMemo(() => 0, undefined, {name: 'memo'})
                                s.createRenderEffect(memo, undefined, {name: 'render'})
                                return 'value'
                            },
                            undefined,
                            {name: 'focused'},
                        )
                        focused()
                    },
                    undefined,
                    {name: 'WRAPPER'},
                )

                const rootOwner = setup.solid.getOwner()! as Solid.Root
                const tree = walker.walkSolidTree(rootOwner, {
                    rootId: $setSdtId(rootOwner, '#0'),
                    onUpdate: () => {
                        /**/
                    },
                    mode: TreeWalkerMode.Owners,
                    eli: eli,
                    registry: registry,
                })

                test.expect(tree).toEqual({
                    id: test.expect.any(String),
                    type: NodeType.Root,
                    name: undefined,
                    children: [
                        {
                            id: test.expect.any(String),
                            name: 'WRAPPER',
                            type: NodeType.Computation,
                            children: [
                                {
                                    id: test.expect.any(String),
                                    name: 'focused',
                                    type: NodeType.Memo,
                                    children: [
                                        {
                                            id: test.expect.any(String),
                                            name: 'memo',
                                            type: NodeType.Memo,
                                            frozen: true,
                                            children: [],
                                        },
                                        {
                                            id: test.expect.any(String),
                                            name: 'render',
                                            type: NodeType.Render,
                                            children: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                } satisfies Mapped.Owner)

                dispose()
            })
        }
    })

    test.it('listen to computation updates', () => {

        let registry = walker.makeComponentRegistry(eli)

        s.createRoot(dispose => {
            const capturedComputationUpdates: Parameters<walker.ComputationUpdateHandler>[] = []

            let computedOwner!: Solid.Owner
            const [a, setA] = s.createSignal(0)
            s.createComputed(() => {
                computedOwner = setup.solid.getOwner()!
                a()
            })

            const owner = setup.solid.getOwner()! as Solid.Root
            walker.walkSolidTree(owner, {
                onUpdate: (...args) => capturedComputationUpdates.push(args),
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Owners,
                eli: eli,
                registry: registry,
            })

            test.expect(capturedComputationUpdates.length).toBe(0)

            setA(1)

            test.expect(capturedComputationUpdates.length).toBe(1)
            test.expect(capturedComputationUpdates[0]).toEqual([
                '#ff',
                computedOwner,
                false,
            ])

            dispose()
        })
    })

    test.it('gathers components', () => {

        let registry = walker.makeComponentRegistry(eli)

        s.createRoot(dispose => {
            const TestComponent = (props: {n: number}) => {
                const [a] = s.createSignal(0)
                s.createComputed(a)
                return <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
            }
            const Button = () => <button>Click me</button>

            s.createRenderEffect(() => <>
                <TestComponent n={5} />
                <Button />
            </>)

            const owner = setup.solid.getOwner()! as Solid.Root

            walker.walkSolidTree(owner, {
                onUpdate: () => {
                    /**/
                },
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Owners,
                eli: eli,
                registry: registry,
            })

            let n_text_comps = 0
            let n_buttons = 0

            for (let comp of registry.components.values()) {
                // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
                switch (comp.name) {
                case 'TestComponent':
                    n_text_comps++
                    break
                case 'Button':
                    n_buttons++
                    break
                default:
                    test.assert(false, `Unexpected component name: ${comp.name}`)
                }
            }

            test.expect(registry.components.size).toBe(7)
            test.expect(n_text_comps).toBe(6)
            test.expect(n_buttons).toBe(1)

            dispose()
        })
    })
})

test.describe('TreeWalkerMode.Components', () => {
    test.it('map component tree', () => {

        let registry = walker.makeComponentRegistry(eli)

        const toTrigger: VoidFunction[] = []
        const testComponents: Solid.Component[] = []

        s.createRoot(dispose => {
            const Wrapper = (props: {children: any}) => {
                return <div>{props.children}</div>
            }
            const TestComponent = (props: {n: number}) => {
                const [a, set] = s.createSignal(0)
                s.createComputed(a)
                toTrigger.push(() => set(1))
                testComponents.push(setup.solid.getOwner()! as Solid.Component)
                return s.createRoot(_ => (
                    <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
                ))
            }
            const Button = () => {
                return <button>Click me</button>
            }

            s.createRenderEffect(() => {
                return (
                    <>
                        <Wrapper>
                            <TestComponent n={3} />
                            <Button />
                        </Wrapper>
                    </>
                )
            })

            const owner = setup.solid.getOwner()! as Solid.Root

            const computationUpdates: Parameters<walker.ComputationUpdateHandler>[] = []

            const tree = walker.walkSolidTree(owner, {
                onUpdate: (...a) => computationUpdates.push(a),
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Components,
                eli: eli,
                registry: registry,
            })

            test.expect(tree).toMatchObject({
                type: NodeType.Root,
                children: [
                    {
                        type: NodeType.Component,
                        name: 'Wrapper',
                        children: [
                            {
                                type: NodeType.Component,
                                name: 'TestComponent',
                                children: [
                                    {
                                        type: NodeType.Component,
                                        name: 'TestComponent',
                                        children: [
                                            {
                                                type: NodeType.Component,
                                                name: 'TestComponent',
                                                children: [
                                                    {
                                                        type: NodeType.Component,
                                                        name: 'TestComponent',
                                                        children: [],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: NodeType.Component,
                                name: 'Button',
                                children: [],
                            },
                        ],
                    },
                ],
            })

            test.expect(computationUpdates.length).toBe(0)

            toTrigger.forEach(t => t())

            test.expect(computationUpdates.length).toBe(4)

            for (let i = 0; i < 4; i++) {
                test.expect(computationUpdates[i]).toEqual([
                    '#ff',
                    testComponents[i],
                    false,
                ])
            }

            dispose()
        })
    })
})

test.describe('TreeWalkerMode.DOM', () => {
    test.it('map dom tree', () => {

        let registry = walker.makeComponentRegistry(eli)

        let to_trigger: (() => void)[] = []
        let test_components: Solid.Component[] = []

        let el_header!: HTMLElement
        let el_h1!:     HTMLHeadingElement

        let el_footer!: HTMLElement
        let el_main!:   HTMLElement
        let el_h2!:     HTMLHeadingElement

        let el_button!: HTMLButtonElement
        let el_span!:   HTMLSpanElement

        let root!: Solid.Root

        const Wrapper = (props: {children: any}) => {
            return <div>{props.children}</div>
        }
        const TestComponent = (props: {n: number}) => {
            const [a, set] = s.createSignal(0)
            s.createComputed(a)
            to_trigger.push(() => set(1))
            test_components.push(setup.solid.getOwner()! as Solid.Component)
            return s.createRoot(_ => (
                <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
            ))
        }
        const Button = () => {
            return <button ref={el_button}>
                <span ref={el_span}>Click me</span>
            </button>
        }

        const App = () => {
            return (
                <>
                    <header ref={el_header}>
                        <h1 ref={el_h1}>Test</h1>
                    </header>
                    <Wrapper>
                        <main ref={el_main}>
                            <h2 ref={el_h2}>Test</h2>
                            <TestComponent n={2} />
                            <Button />
                        </main>
                    </Wrapper>
                    <footer ref={el_footer} />
                </>
            )
        }

        let dispose = s.createRoot(dispose => {
            s.createRenderEffect(() => <App />)

            root = setup.solid.getOwner()! as Solid.Root

            return dispose
        })

        let updates: Parameters<walker.ComputationUpdateHandler>[] = []

        let tree = walker.walkSolidTree(root, {
            onUpdate: (...a) => updates.push(a),
            rootId:   $setSdtId(root, '#ff'),
            mode:     TreeWalkerMode.DOM,
            eli:      eli,
            registry: registry,
        })

        /* Test structure */
        test.expect(tree).toMatchObject({
            type: NodeType.Root,
            children: [{
                type: NodeType.Component,
                name: 'App',
                children: [{
                    type: NodeType.Element,
                    name: 'header',
                    children: [{
                        type: NodeType.Element,
                        name: 'h1',
                        children: [],
                    }],
                }, {
                    type: NodeType.Component,
                    name: 'Wrapper',
                    children: [{
                        type: NodeType.Element,
                        name: 'div',
                        children: [{
                            type: NodeType.Element,
                            name: 'main',
                            children: [{
                                type: NodeType.Element,
                                name: 'h2',
                                children: [],
                            }, {
                                type: NodeType.Component,
                                name: 'TestComponent',
                                children: [{
                                    type: NodeType.Element,
                                    name: 'div',
                                    children: [{
                                        type: NodeType.Component,
                                        name: 'TestComponent',
                                        children: [{
                                            type: NodeType.Element,
                                            name: 'div',
                                            children: [{
                                                type: NodeType.Component,
                                                name: 'TestComponent',
                                                children: [{
                                                    type: NodeType.Element,
                                                    name: 'div',
                                                    children: [],
                                                }],
                                            }],
                                        }],
                                    }],
                                }],
                            }, {
                                type: NodeType.Component,
                                name: 'Button',
                                children: [{
                                    type: NodeType.Element,
                                    name: 'button',
                                    children: [{
                                        type: NodeType.Element,
                                        name: 'span',
                                        children: [],
                                    }],
                                }],
                            }],
                        }],
                    }],
                }, {
                    type: NodeType.Element,
                    name: 'footer',
                    children: [],
                }],
            }],
        })

        /* Test finding components */
        let res_header = walker.findComponent(registry, el_header)
        let res_h1     = walker.findComponent(registry, el_h1)
        let res_main   = walker.findComponent(registry, el_main)
        let res_h2     = walker.findComponent(registry, el_h2)
        let res_footer = walker.findComponent(registry, el_footer)
        let res_button = walker.findComponent(registry, el_button)
        let res_span   = walker.findComponent(registry, el_span)

        test.expect(res_header).toHaveProperty('name', 'App')
        test.expect(res_h1)    .toHaveProperty('name', 'App')
        test.expect(res_main)  .toHaveProperty('name', 'Wrapper')
        test.expect(res_h2)    .toHaveProperty('name', 'Wrapper')
        test.expect(res_footer).toHaveProperty('name', 'App')
        test.expect(res_button).toHaveProperty('name', 'Button')
        test.expect(res_span)  .toHaveProperty('name', 'Button')

        /* Test updates */
        test.expect(updates.length).toBe(0)

        for (let t of to_trigger) t()

        for (let i = 0; i < 3; i++) {
            test.expect(updates[i]).toEqual(['#ff', test_components[i], true])
        }

        dispose()
    })
})
