import '../setup.ts'

import * as s from 'solid-js'
import * as test from 'vitest'
import {NodeType} from '../main/constants.ts'
import {ObjectType, getSdtId} from '../main/id.ts'
import setup from '../main/setup.ts'
import type {NodeID, Solid} from '../main/types.ts'
import {type SerializedDGraph, collectDependencyGraph} from './collect.ts'


test.describe('collectDependencyGraph', () => {
    test.it('should collect dependency graph', () => {
        let rootOwner!: Solid.Root
        let subRootOwner!: Solid.Root

        const [e] = s.createSignal(0, {name: 's-e'})

        s.createRoot(() => {
            const [a] = s.createSignal(0, {name: 's-a'})
            const [b] = s.createSignal(0, {name: 's-b'})
            const [c] = s.createSignal(0, {name: 's-c'})

            const memoA = s.createMemo(() => a() + e(), null, {name: 'm-a'})

            rootOwner = setup.solid.getOwner()! as Solid.Root

            s.createRoot(_ => {
                const [d] = s.createSignal(0, {name: 's-d'})
                const memoB = s.createMemo(() => b() + c(), null, {name: 'm-b'})

                subRootOwner = setup.solid.getOwner()! as Solid.Root

                s.createComputed(() => {
                    memoA()
                    memoB()
                    c()
                    d()
                }, null, {name: 'c'})
            })
        })

        const nodes = (() => {
            const [signalA, signalB, signalC] = rootOwner.sourceMap as [
                Solid.Signal,
                Solid.Signal,
                Solid.Signal,
            ]
            const [memoA] = rootOwner.owned as [Solid.Memo]
            const [signalD] = subRootOwner.sourceMap as [Solid.Signal]
            const [memoB, computed] = subRootOwner.owned as [Solid.Memo, Solid.Computation]

            return {
                rootId: getSdtId(rootOwner, ObjectType.Owner),
                subRootId: getSdtId(subRootOwner, ObjectType.Owner),
                signalAId: getSdtId(signalA, ObjectType.Signal),
                signalBId: getSdtId(signalB, ObjectType.Signal),
                signalCId: getSdtId(signalC, ObjectType.Signal),
                signalDId: getSdtId(signalD, ObjectType.Signal),
                signalEId: getSdtId(memoA.sources![1] as Solid.Signal, ObjectType.Signal),
                memoA,
                memoAId: getSdtId(memoA, ObjectType.Owner),
                memoBId: getSdtId(memoB, ObjectType.Owner),
                computed,
                computedId: getSdtId(computed, ObjectType.Owner),
            }
        })()

        let result = collectDependencyGraph(nodes.computed, {
            onNodeUpdate: () => {
                /**/
            },
        })

        test.expect(result.graph, 'graph of computedOwner').toEqual({
            [nodes.computedId]: {
                name: 'c',
                type: NodeType.Computation,
                depth: 2,
                sources: [nodes.memoAId, nodes.memoBId, nodes.signalCId, nodes.signalDId],
                observers: undefined,
                graph: undefined,
            },
            [nodes.memoAId]: {
                name: 'm-a',
                type: NodeType.Memo,
                depth: 1,
                sources: [nodes.signalAId, nodes.signalEId],
                observers: [nodes.computedId],
                graph: undefined,
            },
            [nodes.memoBId]: {
                name: 'm-b',
                type: NodeType.Memo,
                depth: 2,
                sources: [nodes.signalBId, nodes.signalCId],
                observers: [nodes.computedId],
                graph: undefined,
            },
            [nodes.signalCId]: {
                name: 's-c',
                type: NodeType.Signal,
                depth: 1,
                observers: [nodes.memoBId, nodes.computedId],
                graph: nodes.rootId,
                sources: undefined,
            },
            [nodes.signalDId]: {
                name: 's-d',
                type: NodeType.Signal,
                depth: 2,
                observers: [nodes.computedId],
                graph: nodes.subRootId,
                sources: undefined,
            },
            [nodes.signalAId]: {
                name: 's-a',
                type: NodeType.Signal,
                depth: 1,
                observers: [nodes.memoAId],
                graph: nodes.rootId,
                sources: undefined,
            },
            [nodes.signalEId]: {
                name: 's-e',
                type: NodeType.Signal,
                depth: 0,
                observers: [nodes.memoAId],
                graph: undefined,
                sources: undefined,
            },
            [nodes.signalBId]: {
                name: 's-b',
                type: NodeType.Signal,
                depth: 1,
                observers: [nodes.memoBId],
                graph: nodes.rootId,
                sources: undefined,
            },
        } satisfies SerializedDGraph.Graph)

        test.expect(result.graph, 'is JSON-serializable').toMatchObject(
            JSON.parse(JSON.stringify(result.graph)) as any,
        )

        result = collectDependencyGraph(nodes.memoA, {
            onNodeUpdate: () => {
                /**/
            },
        })

        test.expect(result.graph).toEqual({
            [nodes.computedId]: {
                name: 'c',
                type: NodeType.Computation,
                depth: 2,
                sources: [nodes.memoAId, nodes.memoBId, nodes.signalCId, nodes.signalDId],
                observers: undefined,
                graph: undefined,
            },
            [nodes.memoAId]: {
                name: test.expect.any(String),
                type: NodeType.Memo,
                depth: 1,
                sources: [nodes.signalAId, nodes.signalEId],
                observers: [nodes.computedId],
                graph: undefined,
            },
            [nodes.signalAId]: {
                name: test.expect.any(String),
                type: NodeType.Signal,
                depth: 1,
                observers: [nodes.memoAId],
                graph: nodes.rootId,
                sources: undefined,
            },
            [nodes.signalEId]: {
                name: test.expect.any(String),
                type: NodeType.Signal,
                depth: 0,
                observers: [nodes.memoAId],
                graph: undefined,
                sources: undefined,
            },
        } satisfies SerializedDGraph.Graph)

        test.expect(result.graph, 'is JSON-serializable').toMatchObject(
            JSON.parse(JSON.stringify(result.graph)) as any,
        )
    })

    test.it('listens to visited nodes', () => {
        const captured: NodeID[] = []
        const cb = test.vi.fn(a => captured.push(a))

        s.createRoot(() => {
            const [a, setA] = s.createSignal(0, {name: 's-a'})
            const [b, setB] = s.createSignal(0, {name: 's-b'})
            const [c, setC] = s.createSignal(0, {name: 's-c'})
            const [d, setD] = s.createSignal(0, {name: 's-d'})

            const mA = s.createMemo(() => a() + b(), undefined, {name: 'm-a'})

            s.createComputed(() => {c(); d()}, undefined, {name: 'c-a'})

            s.createComputed(() => {mA(); c()}, undefined, {name: 'c-b'})

            const nodes = (() => {
                const [signalA, signalB, signalC, signalD] = setup.solid.getOwner()!.sourceMap as [
                    Solid.Signal,
                    Solid.Signal,
                    Solid.Signal,
                    Solid.Signal,
                ]
                const [memoA, computedA, computedB] = setup.solid.getOwner()!.owned as [
                    Solid.Memo,
                    Solid.Computation,
                    Solid.Computation,
                ]

                return {
                    rootId: getSdtId(setup.solid.getOwner()!, ObjectType.Owner),
                    signalAId: getSdtId(signalA, ObjectType.Signal),
                    signalBId: getSdtId(signalB, ObjectType.Signal),
                    signalCId: getSdtId(signalC, ObjectType.Signal),
                    signalDId: getSdtId(signalD, ObjectType.Signal),
                    memoAId: getSdtId(memoA, ObjectType.Owner),
                    computedAId: getSdtId(computedA, ObjectType.Owner),
                    computedB,
                    computedBId: getSdtId(computedB, ObjectType.Owner),
                }
            })()

            const result = collectDependencyGraph(nodes.computedB, {onNodeUpdate: cb})

            test.expect(result.graph).toEqual({
                [nodes.computedBId]: {
                    name: 'c-b',
                    type: NodeType.Computation,
                    depth: 1,
                    sources: [nodes.memoAId, nodes.signalCId],
                    observers: undefined,
                    graph: undefined,
                },
                [nodes.memoAId]: {
                    name: 'm-a',
                    type: NodeType.Memo,
                    depth: 1,
                    sources: [nodes.signalAId, nodes.signalBId],
                    observers: [nodes.computedBId],
                    graph: undefined,
                },
                [nodes.signalCId]: {
                    name: 's-c',
                    type: NodeType.Signal,
                    depth: 1,
                    observers: [nodes.computedAId, nodes.computedBId],
                    graph: nodes.rootId,
                    sources: undefined,
                },
                [nodes.signalAId]: {
                    name: 's-a',
                    type: NodeType.Signal,
                    depth: 1,
                    observers: [nodes.memoAId],
                    graph: nodes.rootId,
                    sources: undefined,
                },
                [nodes.signalBId]: {
                    name: 's-b',
                    type: NodeType.Signal,
                    depth: 1,
                    observers: [nodes.memoAId],
                    graph: nodes.rootId,
                    sources: undefined,
                },
            } satisfies SerializedDGraph.Graph)

            test.expect(cb).toHaveBeenCalledTimes(0)

            setA(1)

            test.expect(captured).toHaveLength(3)
            test.expect(captured.includes(nodes.signalAId)).toBeTruthy()
            test.expect(captured.includes(nodes.memoAId)).toBeTruthy()
            test.expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setB(1)

            test.expect(captured).toHaveLength(3)
            test.expect(captured.includes(nodes.signalBId)).toBeTruthy()
            test.expect(captured.includes(nodes.memoAId)).toBeTruthy()
            test.expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setC(1)

            test.expect(captured).toHaveLength(2)
            test.expect(captured.includes(nodes.signalCId)).toBeTruthy()
            test.expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setD(1)

            test.expect(captured.length).toBe(0)

            s.batch(() => {
                setA(2)
                setB(2)
                setC(2)
            })

            test.expect(captured).toHaveLength(5)
            test.expect(captured.includes(nodes.signalAId)).toBeTruthy()
            test.expect(captured.includes(nodes.signalBId)).toBeTruthy()
            test.expect(captured.includes(nodes.signalCId)).toBeTruthy()
            test.expect(captured.includes(nodes.memoAId)).toBeTruthy()
            test.expect(captured.includes(nodes.computedBId)).toBeTruthy()
        })
    })
})
