import '../../setup.ts'

import * as s from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getObjectById, getSdtId, ObjectType} from '../../main/id.ts'
import setup from '../../main/setup.ts'
import {type Mapped, NodeType, PropGetterState, type Solid, ValueType} from '../../types.ts'
import {collectOwnerDetails} from '../inspector.ts'

let mockLAST_ID = 0
beforeEach(() => {
    mockLAST_ID = 0
})
vi.mock('../../main/get-id', () => ({getNewSdtId: () => '#' + mockLAST_ID++}))

describe('collectOwnerDetails', () => {
    it('collects focused owner details', () => {
        s.createRoot(dispose => {
            const [source] = s.createSignal(0, {name: 'source'})

            let memo!: Solid.Owner
            const div = document.createElement('div')

            s.createComputed(() => {

                const focused = s.createMemo(() => {
                    
                    memo = setup.solid.getOwner()!
                    
                    source()

                    s.DEV!.registerGraph({
                        value: {foo: 123},
                        name:  'custom value',
                    })
                    s.createSignal(div, {name: 'element'})
                    const m = s.createMemo(() => 0, undefined, {name: 'memo'})
                    s.createRenderEffect(m, undefined, {name: 'render'})

                    return 'value'
                }, undefined, {name: 'focused'})

                focused()

            }, undefined, {name: 'WRAPPER'})

            const [customValue, signalB] = memo.sourceMap as [Solid.SourceMapValue, Solid.Signal]
            const [innerMemo] = memo.owned as [Solid.Memo, Solid.Computation]

            const {details, valueMap} = collectOwnerDetails(memo, {
                observedPropsMap: new WeakMap(),
                onPropStateChange: () => {
                    /**/
                },
                onValueUpdate: () => {
                    /**/
                },
            })

            expect(details).toEqual({
                id: getSdtId(memo, ObjectType.Owner),
                name: 'focused',
                type: NodeType.Memo,
                value: [[ValueType.String, 'value']],
                signals: [
                    {
                        type: NodeType.CustomValue,
                        id: getSdtId(customValue, ObjectType.CustomValue),
                        name: 'custom value',
                        value: [[ValueType.Object, 1]],
                    },
                    {
                        type: NodeType.Signal,
                        id: getSdtId(signalB, ObjectType.Signal),
                        name: 'element',
                        value: [[ValueType.Element, '#4:div']],
                    },
                    {
                        type: NodeType.Memo,
                        id: getSdtId(innerMemo, ObjectType.Owner),
                        name: 'memo',
                        value: [[ValueType.Number, 0]],
                    },
                ],
            } satisfies Mapped.OwnerDetails)

            expect(valueMap.get(`signal:${getSdtId(customValue, ObjectType.CustomValue)}`)).toBeTruthy()
            expect(valueMap.get(`signal:${getSdtId(signalB, ObjectType.Signal)}`)).toBeTruthy()
            expect(valueMap.get(`signal:${getSdtId(innerMemo, ObjectType.Owner)}`)).toBeTruthy()

            expect(getObjectById('#4', ObjectType.Element)).toBe(div)

            dispose()
        })
    })

    it('component props', () => {
        s.createRoot(dispose => {
            let owner!: Solid.Owner
            const TestComponent = (props: {
                count: number
                children: s.JSX.Element
                nested: {foo: number; bar: string}
            }) => {
                owner = setup.solid.getOwner()!
                return <div>{props.children}</div>
            }
            s.createRenderEffect(() => (
                <TestComponent count={123} nested={{foo: 1, bar: '2'}}>
                    <button>Click me</button>
                </TestComponent>
            ))

            const {details} = collectOwnerDetails(owner, {
                observedPropsMap: new WeakMap(),
                onPropStateChange: () => {
                    /**/
                },
                onValueUpdate: () => {
                    /**/
                },
            })

            dispose()

            expect(details).toEqual({
                id: '#1',
                name: 'TestComponent',
                type: NodeType.Component,
                signals: [],
                value: [[ValueType.Element, '#2:div']],
                props: {
                    proxy: false,
                    record: {
                        count: {
                            getter: false,
                            value: [[ValueType.Number, 123]],
                        },
                        nested: {
                            getter: false,
                            value: [[ValueType.Object, 2]],
                        },
                        children: {
                            getter: PropGetterState.Stale,
                            value: null,
                        },
                    },
                },
            } satisfies Mapped.OwnerDetails)

            expect(getObjectById('#2', ObjectType.Element)).toBeInstanceOf(HTMLDivElement)
        })
    })

    it('dynamic component props', () => {
        s.createRoot(dispose => {
            let owner!: Solid.Owner
            const Button = (props: s.JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
                owner = setup.solid.getOwner()!
                return <button {...props}>Click me</button>
            }
            s.createRenderEffect(() => {
                const props = () =>
                    ({
                        onClick: () => {
                            /**/
                        },
                        role: 'button',
                    }) as const
                return <Button {...props()} />
            })

            const {details} = collectOwnerDetails(owner, {
                observedPropsMap: new WeakMap(),
                onPropStateChange: () => {
                    /**/
                },
                onValueUpdate: () => {
                    /**/
                },
            })

            expect(details).toEqual({
                id: '#1',
                name: 'Button',
                type: NodeType.Component,
                signals: [],
                value: [[ValueType.Element, '#2:button']],
                props: {
                    proxy: true,
                    record: {
                        onClick: {
                            getter: PropGetterState.Stale,
                            value: null,
                        },
                        role: {
                            getter: PropGetterState.Stale,
                            value: null,
                        },
                    },
                },
            } satisfies Mapped.OwnerDetails)

            expect(getObjectById('#2', ObjectType.Element)).toBeInstanceOf(HTMLButtonElement)

            dispose()
        })
    })

    it('listens to value updates', () => {
        s.createRoot(dispose => {
            let owner!: Solid.Owner

            const [count, setCount] = s.createSignal(0)
            s.createMemo(() => {
                owner = setup.solid.getOwner()!
                return count()
            })

            const onValueUpdate = vi.fn()
            collectOwnerDetails(owner, {
                observedPropsMap: new WeakMap(),
                onPropStateChange: () => {
                    /**/
                },
                onValueUpdate: onValueUpdate,
            })

            expect(onValueUpdate).not.toBeCalled()

            setCount(1)
            expect(onValueUpdate).toBeCalledTimes(1)
            expect(onValueUpdate).toHaveBeenLastCalledWith('value')

            setCount(2)
            expect(onValueUpdate).toBeCalledTimes(2)
            expect(onValueUpdate).toHaveBeenLastCalledWith('value')

            setCount(2)
            expect(onValueUpdate).toBeCalledTimes(2)

            dispose()
        })
    })

    it('listens to signal updates', () => {
        s.createRoot(dispose => {
            const owner = setup.solid.getOwner()!
            const [, setCount] = s.createSignal(0) // id: "0"
            const [, setCount2] = s.createSignal(0) // id: "1"

            const onValueUpdate = vi.fn()
            collectOwnerDetails(owner, {
                observedPropsMap: new WeakMap(),
                onPropStateChange: () => {
                    /**/
                },
                onValueUpdate: onValueUpdate,
            })

            expect(onValueUpdate).not.toBeCalled()

            setCount(1)
            expect(onValueUpdate).toBeCalledTimes(1)
            expect(onValueUpdate).toHaveBeenLastCalledWith('signal:#1')

            setCount(1)
            expect(onValueUpdate).toBeCalledTimes(1)

            setCount2(1)
            expect(onValueUpdate).toBeCalledTimes(2)
            expect(onValueUpdate).toHaveBeenLastCalledWith('signal:#2')

            dispose()
        })
    })
})
