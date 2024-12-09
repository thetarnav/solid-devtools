import {batch, createComputed, createMemo, createRoot, createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {NodeType} from '../../main/constants.ts'
import {ObjectType, getSdtId} from '../../main/id.ts'
import SolidApi from '../../main/solid-api.ts'
import type {NodeID, Solid} from '../../main/types.ts'
import {type SerializedDGraph, collectDependencyGraph} from '../collect.ts'

const {getOwner} = SolidApi

let mockLAST_ID = 0
beforeEach(() => {
    mockLAST_ID = 0
})
vi.mock('../../main/get-id', () => ({getNewSdtId: () => '#' + mockLAST_ID++}))

describe('collectDependencyGraph', () => {
    it('should collect dependency graph', () => {
        let rootOwner!: Solid.Root
        let subRootOwner!: Solid.Root

        const [e] = createSignal(0, {name: 's-e'})

        createRoot(() => {
            const [a] = createSignal(0, {name: 's-a'})
            const [b] = createSignal(0, {name: 's-b'})
            const [c] = createSignal(0, {name: 's-c'})

            const memoA = createMemo(() => a() + e(), null, {name: 'm-a'})

            rootOwner = getOwner()! as Solid.Root

            createRoot(_ => {
                const [d] = createSignal(0, {name: 's-d'})
                const memoB = createMemo(() => b() + c(), null, {name: 'm-b'})

                subRootOwner = getOwner()! as Solid.Root

                createComputed(
                    () => {
                        memoA()
                        memoB()
                        c()
                        d()
                    },
                    null,
                    {name: 'c'},
                )
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

        expect(result.graph, 'graph of computedOwner').toEqual({
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

        expect(result.graph, 'is JSON-serializable').toMatchObject(
            JSON.parse(JSON.stringify(result.graph)) as any,
        )

        result = collectDependencyGraph(nodes.memoA, {
            onNodeUpdate: () => {
                /**/
            },
        })

        expect(result.graph).toEqual({
            [nodes.computedId]: {
                name: 'c',
                type: NodeType.Computation,
                depth: 2,
                sources: [nodes.memoAId, nodes.memoBId, nodes.signalCId, nodes.signalDId],
                observers: undefined,
                graph: undefined,
            },
            [nodes.memoAId]: {
                name: expect.any(String),
                type: NodeType.Memo,
                depth: 1,
                sources: [nodes.signalAId, nodes.signalEId],
                observers: [nodes.computedId],
                graph: undefined,
            },
            [nodes.signalAId]: {
                name: expect.any(String),
                type: NodeType.Signal,
                depth: 1,
                observers: [nodes.memoAId],
                graph: nodes.rootId,
                sources: undefined,
            },
            [nodes.signalEId]: {
                name: expect.any(String),
                type: NodeType.Signal,
                depth: 0,
                observers: [nodes.memoAId],
                graph: undefined,
                sources: undefined,
            },
        } satisfies SerializedDGraph.Graph)

        expect(result.graph, 'is JSON-serializable').toMatchObject(
            JSON.parse(JSON.stringify(result.graph)) as any,
        )
    })

    it('listens to visited nodes', () => {
        const captured: NodeID[] = []
        const cb = vi.fn(a => captured.push(a))

        createRoot(() => {
            const [a, setA] = createSignal(0, {name: 's-a'})
            const [b, setB] = createSignal(0, {name: 's-b'})
            const [c, setC] = createSignal(0, {name: 's-c'})
            const [d, setD] = createSignal(0, {name: 's-d'})

            const mA = createMemo(() => a() + b(), undefined, {name: 'm-a'})

            createComputed(
                () => {
                    c()
                    d()
                },
                undefined,
                {name: 'c-a'},
            )

            createComputed(
                () => {
                    mA()
                    c()
                },
                undefined,
                {name: 'c-b'},
            )

            const nodes = (() => {
                const [signalA, signalB, signalC, signalD] = getOwner()!.sourceMap as [
                    Solid.Signal,
                    Solid.Signal,
                    Solid.Signal,
                    Solid.Signal,
                ]
                const [memoA, computedA, computedB] = getOwner()!.owned as [
                    Solid.Memo,
                    Solid.Computation,
                    Solid.Computation,
                ]

                return {
                    rootId: getSdtId(getOwner()!, ObjectType.Owner),
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

            expect(result.graph).toEqual({
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

            expect(cb).toHaveBeenCalledTimes(0)

            setA(1)

            expect(captured).toHaveLength(3)
            expect(captured.includes(nodes.signalAId)).toBeTruthy()
            expect(captured.includes(nodes.memoAId)).toBeTruthy()
            expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setB(1)

            expect(captured).toHaveLength(3)
            expect(captured.includes(nodes.signalBId)).toBeTruthy()
            expect(captured.includes(nodes.memoAId)).toBeTruthy()
            expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setC(1)

            expect(captured).toHaveLength(2)
            expect(captured.includes(nodes.signalCId)).toBeTruthy()
            expect(captured.includes(nodes.computedBId)).toBeTruthy()

            captured.length = 0
            setD(1)

            expect(captured.length).toBe(0)

            batch(() => {
                setA(2)
                setB(2)
                setC(2)
            })

            expect(captured).toHaveLength(5)
            expect(captured.includes(nodes.signalAId)).toBeTruthy()
            expect(captured.includes(nodes.signalBId)).toBeTruthy()
            expect(captured.includes(nodes.signalCId)).toBeTruthy()
            expect(captured.includes(nodes.memoAId)).toBeTruthy()
            expect(captured.includes(nodes.computedBId)).toBeTruthy()
        })
    })
})
