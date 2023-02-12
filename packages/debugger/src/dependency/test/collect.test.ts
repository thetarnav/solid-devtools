import { batch, createComputed, createMemo, createRoot, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeType } from '../../main/constants'
import { $setSdtId } from '../../main/id'
import type { NodeID, Solid } from '../../main/types'
import { getOwner } from '../../main/utils'
import { collectDependencyGraph, SerializedDGraph } from '../collect'

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/getId', () => ({ getNewSdtId: () => '#' + mockLAST_ID++ }))

describe('collectDependencyGraph', () => {
  it('should collect dependency graph', () => {
    let computedOwner!: Solid.Computation
    let memoAOwner!: Solid.Computation

    const [e] = createSignal(0)

    createRoot(() => {
      $setSdtId(getOwner()!, '#ff')

      const [a] = createSignal(0)
      const [b] = createSignal(0)
      const [c] = createSignal(0)

      const memoA = createMemo(() => {
        memoAOwner = getOwner()! as Solid.Computation
        a() + e()
      })

      createRoot(_ => {
        const [d] = createSignal(0)
        const memoB = createMemo(() => b() + c())

        createComputed(() => {
          computedOwner = getOwner()! as Solid.Computation
          memoA()
          memoB()
          c()
          d()
        })
      })
    })

    let result = collectDependencyGraph(computedOwner, { onNodeUpdate: () => {} })

    expect(result.graph, 'graph of computedOwner').toEqual({
      '#0': {
        name: expect.any(String),
        type: NodeType.Computation,
        depth: 2,
        sources: ['#2', '#3', '#4', '#5'],
        observers: undefined,
        graph: undefined,
      },
      '#2': {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 1,
        sources: ['#6', '#7'],
        observers: ['#0'],
        graph: undefined,
      },
      '#3': {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 2,
        sources: ['#8', '#4'],
        observers: ['#0'],
        graph: undefined,
      },
      '#4': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 1,
        observers: ['#3', '#0'],
        graph: '#ff',
        sources: undefined,
      },
      '#5': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 2,
        observers: ['#0'],
        graph: '#1',
        sources: undefined,
      },
      '#6': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 1,
        observers: ['#2'],
        graph: '#ff',
        sources: undefined,
      },
      '#7': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 0,
        observers: ['#2'],
        graph: undefined,
        sources: undefined,
      },
      '#8': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 1,
        observers: ['#3'],
        graph: '#ff',
        sources: undefined,
      },
    } satisfies SerializedDGraph.Graph)

    expect(result.graph, 'is JSON-serializable').toMatchObject(
      JSON.parse(JSON.stringify(result.graph)),
    )

    result = collectDependencyGraph(memoAOwner, { onNodeUpdate: () => {} })

    expect(result.graph).toEqual({
      '#0': {
        name: expect.any(String),
        type: NodeType.Computation,
        depth: 2,
        sources: ['#2', '#3', '#4', '#5'],
        observers: undefined,
        graph: undefined,
      },
      '#2': {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 1,
        sources: ['#6', '#7'],
        observers: ['#0'],
        graph: undefined,
      },
      '#6': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 1,
        observers: ['#2'],
        graph: '#ff',
        sources: undefined,
      },
      '#7': {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 0,
        observers: ['#2'],
        graph: undefined,
        sources: undefined,
      },
    } satisfies SerializedDGraph.Graph)

    expect(result.graph, 'is JSON-serializable').toMatchObject(
      JSON.parse(JSON.stringify(result.graph)),
    )
  })

  it('listens to visited nodes', () => {
    let owner!: Solid.Computation
    const captured: NodeID[] = []
    const cb = vi.fn(a => captured.push(a))

    createRoot(() => {
      $setSdtId(getOwner()!, '#ff')
      const [a, setA] = createSignal(0)
      const [b, setB] = createSignal(0)
      const [c, setC] = createSignal(0)
      const [d, setD] = createSignal(0)

      const memoA = createMemo(() => a() + b())

      createComputed(() => {
        c()
        d()
      })

      createComputed(() => {
        owner = getOwner()! as Solid.Computation
        memoA()
        c()
      })

      const result = collectDependencyGraph(owner, { onNodeUpdate: cb })

      expect(result.graph).toEqual({
        '#0': {
          name: expect.any(String),
          type: NodeType.Computation,
          depth: 1,
          sources: ['#1', '#2'],
          observers: undefined,
          graph: undefined,
        },
        '#1': {
          name: expect.any(String),
          type: NodeType.Memo,
          depth: 1,
          sources: ['#3', '#4'],
          observers: ['#0'],
          graph: undefined,
        },
        '#2': {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 1,
          observers: ['#5', '#0'],
          graph: '#ff',
          sources: undefined,
        },
        '#3': {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 1,
          observers: ['#1'],
          graph: '#ff',
          sources: undefined,
        },
        '#4': {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 1,
          observers: ['#1'],
          graph: '#ff',
          sources: undefined,
        },
      } satisfies SerializedDGraph.Graph)

      expect(cb).toHaveBeenCalledTimes(0)

      setA(1)

      expect(captured).toHaveLength(3)
      expect(captured[0]).toEqual('#3')
      expect(captured[1]).toEqual('#1')
      expect(captured[2]).toEqual('#0')

      captured.length = 0
      setB(1)

      expect(captured).toHaveLength(3)
      expect(captured[0]).toEqual('#4')
      expect(captured[1]).toEqual('#1')
      expect(captured[2]).toEqual('#0')

      captured.length = 0
      setC(1)

      expect(captured).toHaveLength(2)
      expect(captured[0]).toEqual('#2')
      expect(captured[1]).toEqual('#0')

      captured.length = 0
      setD(1)

      expect(captured.length).toBe(0)

      batch(() => {
        setA(2)
        setB(2)
        setC(2)
      })

      expect(captured).toHaveLength(5)
      expect(captured[0]).toEqual('#3')
      expect(captured[1]).toEqual('#4')
      expect(captured[2]).toEqual('#2')
      expect(captured[3]).toEqual('#1')
      expect(captured[4]).toEqual('#0')
    })
  })
})
