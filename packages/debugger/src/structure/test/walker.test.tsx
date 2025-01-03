import '../../setup.ts'

import * as s from 'solid-js'
import * as test from 'vitest'
import {NodeType, TreeWalkerMode} from '../../main/constants.ts'
import {$setSdtId} from '../../main/id.ts'
import {type Mapped, type Solid} from '../../main/types.ts'
import {getNodeName} from '../../main/utils.ts'
import {type ComputationUpdateHandler, walkSolidTree} from '../walker.ts'
import setup from '../../main/setup.ts'
import {initRoots} from '../../main/roots.ts'

test.beforeAll(() => {
    initRoots()
})

let mockLAST_ID = 0
test.beforeEach(() => {
    mockLAST_ID = 0
})
test.vi.mock('../../main/get-id', () => ({getNewSdtId: () => '#' + mockLAST_ID++}))

test.describe('TreeWalkerMode.Owners', () => {
    test.it('default options', () => {
        {
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

            const tree = walkSolidTree(owner, {
                onComputationUpdate: () => {
                    /**/
                },
                rootId: $setSdtId(owner, '#ff'),
                registerComponent: () => {
                    /**/
                },
                mode: TreeWalkerMode.Owners,
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
                const tree = walkSolidTree(rootOwner, {
                    rootId: $setSdtId(rootOwner, '#0'),
                    onComputationUpdate: () => {
                        /**/
                    },
                    registerComponent: () => {
                        /**/
                    },
                    mode: TreeWalkerMode.Owners,
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
        s.createRoot(dispose => {
            const capturedComputationUpdates: Parameters<ComputationUpdateHandler>[] = []

            let computedOwner!: Solid.Owner
            const [a, setA] = s.createSignal(0)
            s.createComputed(() => {
                computedOwner = setup.solid.getOwner()!
                a()
            })

            const owner = setup.solid.getOwner()! as Solid.Root
            walkSolidTree(owner, {
                onComputationUpdate: (...args) => capturedComputationUpdates.push(args),
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Owners,
                registerComponent: () => {
                    /**/
                },
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
        s.createRoot(dispose => {
            const TestComponent = (props: {n: number}) => {
                const [a] = s.createSignal(0)
                s.createComputed(a)
                return <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
            }
            const Button = () => {
                return <button>Click me</button>
            }

            s.createRenderEffect(() => {
                return (
                    <>
                        <TestComponent n={5} />
                        <Button />
                    </>
                )
            })

            const owner = setup.solid.getOwner()! as Solid.Root

            const components: string[] = []

            walkSolidTree(owner, {
                onComputationUpdate: () => {
                    /**/
                },
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Owners,
                registerComponent: c => {
                    if (!('owner' in c)) return
                    const name = getNodeName(c.owner)
                    name && components.push(name)
                },
            })

            test.expect(components.length).toBe(7)

            let testCompsLength = 0
            let btn!: string
            components.forEach(c => {
                if (c === 'TestComponent') testCompsLength++
                else if (c === 'Button') btn = c
            })
            test.expect(testCompsLength).toBe(6)
            test.expect(btn).toBeTruthy()

            dispose()
        })
    })
})

test.describe('TreeWalkerMode.Components', () => {
    test.it('map component tree', () => {
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

            const computationUpdates: Parameters<ComputationUpdateHandler>[] = []

            const tree = walkSolidTree(owner, {
                onComputationUpdate: (...a) => computationUpdates.push(a),
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.Components,
                registerComponent: () => {
                    /**/
                },
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
            const App = () => {
                return (
                    <>
                        <Wrapper>
                            <main>
                                <TestComponent n={2} />
                                <Button />
                            </main>
                        </Wrapper>
                        <footer />
                    </>
                )
            }
            s.createRenderEffect(() => <App />)

            const owner = setup.solid.getOwner()! as Solid.Root

            const computationUpdates: Parameters<ComputationUpdateHandler>[] = []

            const tree = walkSolidTree(owner, {
                onComputationUpdate: (...a) => computationUpdates.push(a),
                rootId: $setSdtId(owner, '#ff'),
                mode: TreeWalkerMode.DOM,
                registerComponent: () => {
                    /**/
                },
            })

            test.expect(tree).toMatchObject({
                type: NodeType.Root,
                children: [{
                    type: NodeType.Component,
                    name: 'App',
                    children: [{
                        type: NodeType.Component,
                        name: 'Wrapper',
                        children: [{
                            type: NodeType.Element,
                            name: 'div',
                            children: [{
                                type: NodeType.Element,
                                name: 'main',
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
                                        children: [],
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

            test.expect(computationUpdates.length).toBe(0)

            toTrigger.forEach(t => t())

            for (let i = 0; i < 3; i++) {
                test.expect(computationUpdates[i]).toEqual([
                    '#ff',
                    testComponents[i],
                    true,
                ])
            }

            dispose()
        })
    })
})
