import { batch, createComputed, createMemo, createRoot, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { $SDT_ID, NodeType } from '../../main/constants'
import { Solid } from '../../main/types'
import { getOwner, markNodeID } from '../../main/utils'
import { collectDependencyGraph, DGraph } from '../collect'

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/id', () => ({ getNewSdtId: () => mockLAST_ID++ + '' }))

describe('collectDependencyGraph', () => {
  it('should collect dependency graph', () => {
    let computedOwner!: Solid.Computation
    let memoAOwner!: Solid.Computation

    const [e] = createSignal(0)

    createRoot(() => {
      getOwner()![$SDT_ID] = 'ff'

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

    expect(result).toEqual({
      0: {
        name: expect.any(String),
        type: NodeType.Computation,
        depth: 'ff:2',
        sources: ['2', '3', '4', '5'],
        observers: undefined,
      },
      2: {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 'ff:1',
        sources: ['6', '7'],
        observers: ['0'],
      },
      3: {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 'ff:2',
        sources: ['8', '4'],
        observers: ['0'],
      },
      4: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 'ff:1',
        sources: undefined,
        observers: ['3', '0'],
      },
      5: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 'ff:2',
        sources: undefined,
        observers: ['0'],
      },
      6: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 'ff:1',
        sources: undefined,
        observers: ['2'],
      },
      7: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: undefined,
        sources: undefined,
        observers: ['2'],
      },
      8: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 'ff:1',
        sources: undefined,
        observers: ['3'],
      },
    } satisfies DGraph.Graph)

    expect(JSON.parse(JSON.stringify(result)), 'is JSON-serializable').toEqual(result)

    result = collectDependencyGraph(memoAOwner, { onNodeUpdate: () => {} })

    expect(result).toEqual({
      0: {
        name: expect.any(String),
        type: NodeType.Computation,
        depth: 'ff:2',
        sources: ['2', '3', '4', '5'],
      },
      2: {
        name: expect.any(String),
        type: NodeType.Memo,
        depth: 'ff:1',
        sources: ['6', '7'],
        observers: ['0'],
      },
      6: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: 'ff:1',
        sources: undefined,
        observers: ['2'],
      },
      7: {
        name: expect.any(String),
        type: NodeType.Signal,
        depth: undefined,
        sources: undefined,
        observers: ['2'],
      },
    } satisfies DGraph.Graph)

    expect(JSON.parse(JSON.stringify(result)), 'is JSON-serializable').toEqual(result)
  })

  it('listens to visited nodes', () => {
    let owner!: Solid.Computation
    const captured: any[] = []
    const cb = vi.fn(a => captured.push(a))

    createRoot(() => {
      getOwner()![$SDT_ID] = 'ff'
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

      expect(result).toEqual({
        0: {
          name: expect.any(String),
          type: NodeType.Computation,
          depth: 'ff:1',
          sources: ['1', '2'],
          observers: undefined,
        },
        1: {
          name: expect.any(String),
          type: NodeType.Memo,
          depth: 'ff:1',
          sources: ['3', '4'],
          observers: ['0'],
        },
        2: {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 'ff:1',
          sources: undefined,
          observers: ['5', '0'],
        },
        3: {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 'ff:1',
          sources: undefined,
          observers: ['1'],
        },
        4: {
          name: expect.any(String),
          type: NodeType.Signal,
          depth: 'ff:1',
          sources: undefined,
          observers: ['1'],
        },
      } satisfies DGraph.Graph)

      expect(cb).toHaveBeenCalledTimes(0)

      setA(1)

      expect(captured).toHaveLength(3)
      expect(markNodeID(captured[0])).toEqual('3')
      expect(markNodeID(captured[1])).toEqual('1')
      expect(markNodeID(captured[2])).toEqual('0')

      captured.length = 0
      setB(1)

      expect(captured).toHaveLength(3)
      expect(markNodeID(captured[0])).toEqual('4')
      expect(markNodeID(captured[1])).toEqual('1')
      expect(markNodeID(captured[2])).toEqual('0')

      captured.length = 0
      setC(1)

      expect(captured).toHaveLength(2)
      expect(markNodeID(captured[0])).toEqual('2')
      expect(markNodeID(captured[1])).toEqual('0')

      captured.length = 0
      setD(1)

      expect(captured.length).toBe(0)

      batch(() => {
        setA(2)
        setB(2)
        setC(2)
      })

      expect(captured).toHaveLength(5)
      expect(markNodeID(captured[0])).toEqual('3')
      expect(markNodeID(captured[1])).toEqual('4')
      expect(markNodeID(captured[2])).toEqual('2')
      expect(markNodeID(captured[3])).toEqual('1')
      expect(markNodeID(captured[4])).toEqual('0')
    })
  })
})
