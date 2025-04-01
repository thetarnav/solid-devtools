import '../setup.ts'

import * as s from 'solid-js'
import * as test from 'vitest'
import {getObjectById, getSdtId, ObjectType} from '../main/id.ts'
import setup from '../main/setup.ts'
import {dom_element_interface, type Mapped, NodeType, PropGetterState, type Solid, ValueType} from '../types.ts'
import {collectOwnerDetails} from './inspector.ts'

const eli = dom_element_interface

test.describe('collectOwnerDetails', () => {
    test.it('collects focused owner details', () => {
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
                observedPropsMap:  new WeakMap(),
                onPropStateChange: () => {/**/},
                onValueUpdate:     () => {/**/},
                eli:               eli,
            })

            test.expect(details).toEqual({
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
                        value: [[ValueType.Element, '#3:div']],
                    },
                    {
                        type: NodeType.Memo,
                        id: getSdtId(innerMemo, ObjectType.Owner),
                        name: 'memo',
                        value: [[ValueType.Number, 0]],
                    },
                ],
            } satisfies Mapped.OwnerDetails)

            test.expect(valueMap.get(`signal:${getSdtId(customValue, ObjectType.CustomValue)}`)).toBeTruthy()
            test.expect(valueMap.get(`signal:${getSdtId(signalB, ObjectType.Signal)}`)).toBeTruthy()
            test.expect(valueMap.get(`signal:${getSdtId(innerMemo, ObjectType.Owner)}`)).toBeTruthy()

            test.expect(getObjectById('#3', ObjectType.Element)).toBe(div)

            dispose()
        })
    })

    test.it('component props', () => {
        s.createRoot(dispose => {

            let owner!: Solid.Owner
            let div_ref!: HTMLDivElement

            const TestComponent = (props: {
                count: number
                children: s.JSX.Element
                nested: {foo: number; bar: string}
            }) => {
                owner = setup.solid.getOwner()!
                return <div ref={div_ref}>{props.children}</div>
            }
            s.createRenderEffect(() => (
                <TestComponent count={123} nested={{foo: 1, bar: '2'}}>
                    <button>Click me</button>
                </TestComponent>
            ))

            const {details} = collectOwnerDetails(owner, {
                observedPropsMap:  new WeakMap(),
                onPropStateChange: () => {/**/},
                onValueUpdate:     () => {/**/},
                eli:               eli,
            })

            dispose()

            test.expect(details).toEqual({
                id: getSdtId(owner, ObjectType.Owner),
                name: 'TestComponent',
                type: NodeType.Component,
                signals: [],
                value: [[ValueType.Element, `${getSdtId(div_ref, ObjectType.Element)}:div`]],
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
        })
    })

    test.it('dynamic component props', () => {
        s.createRoot(dispose => {

            let owner!: Solid.Owner
            let el_ref!: HTMLDivElement

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
                return (el_ref = <Button {...props()} /> as any)
            })

            const {details} = collectOwnerDetails(owner, {
                observedPropsMap:  new WeakMap(),
                onPropStateChange: () => {/**/},
                onValueUpdate:     () => {/**/},
                eli:               eli,
            })

            test.expect(details).toEqual({
                id: getSdtId(owner, ObjectType.Owner),
                name: 'Button',
                type: NodeType.Component,
                signals: [],
                value: [[ValueType.Element, `${getSdtId(el_ref, ObjectType.Element)}:button`]],
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

            dispose()
        })
    })

    test.it('listens to value updates', () => {
        s.createRoot(dispose => {
            let owner!: Solid.Owner

            const [count, setCount] = s.createSignal(0)
            s.createMemo(() => {
                owner = setup.solid.getOwner()!
                return count()
            })

            const onValueUpdate = test.vi.fn()
            collectOwnerDetails(owner, {
                observedPropsMap:  new WeakMap(),
                onPropStateChange: () => {/**/},
                onValueUpdate:     onValueUpdate,
                eli:               eli,
            })

            test.expect(onValueUpdate).not.toBeCalled()

            setCount(1)
            test.expect(onValueUpdate).toBeCalledTimes(1)
            test.expect(onValueUpdate).toHaveBeenLastCalledWith('value')

            setCount(2)
            test.expect(onValueUpdate).toBeCalledTimes(2)
            test.expect(onValueUpdate).toHaveBeenLastCalledWith('value')

            setCount(2)
            test.expect(onValueUpdate).toBeCalledTimes(2)

            dispose()
        })
    })

    test.it('listens to signal updates', () => {
        s.createRoot(dispose => {
            const owner = setup.solid.getOwner()!
            const [, setCount1] = s.createSignal(0)
            const [, setCount2] = s.createSignal(0)

            const [count1, count2] = owner.sourceMap as [Solid.Signal, Solid.Signal]

            const onValueUpdate = test.vi.fn()
            collectOwnerDetails(owner, {
                observedPropsMap:  new WeakMap(),
                onPropStateChange: () => {/**/},
                onValueUpdate:     onValueUpdate,
                eli:               eli,
            })

            test.expect(onValueUpdate).not.toBeCalled()

            setCount1(1)
            test.expect(onValueUpdate).toBeCalledTimes(1)
            test.expect(onValueUpdate).toHaveBeenLastCalledWith(`signal:${getSdtId(count1, ObjectType.Signal)}`)

            setCount1(1)
            test.expect(onValueUpdate).toBeCalledTimes(1)

            setCount2(1)
            test.expect(onValueUpdate).toBeCalledTimes(2)
            test.expect(onValueUpdate).toHaveBeenLastCalledWith(`signal:${getSdtId(count2, ObjectType.Signal)}`)

            dispose()
        })
    })
})
