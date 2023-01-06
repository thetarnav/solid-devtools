import { createComputed, createMemo, createRenderEffect, createRoot, createSignal } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { $SDT_ID, NodeType } from '../../main/constants'
import { Solid } from '../../main/types'
import { getOwner } from '../../main/utils'
import { collectDependencyGraph, DGraph } from '../collect'

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/id', () => ({ getNewSdtId: () => mockLAST_ID++ + '' }))

describe('collectDependencyGraph', () => {
  it('should collect dependency graph', () => {
    let owner!: Solid.Computation

    const [e] = createSignal(0)

    createRoot(() => {
      getOwner()![$SDT_ID] = 'ff'

      const [a] = createSignal(0)
      const [b] = createSignal(0)
      const [c] = createSignal(0)

      const memoA = createMemo(() => a() + e())

      createRenderEffect(() => {
        const [d] = createSignal(0)
        const memoB = createMemo(() => b() + c())

        createComputed(() => {
          owner = getOwner()! as Solid.Computation
          memoA()
          memoB()
          c()
          d()
        })
      })
    })

    const result = collectDependencyGraph(owner)

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
        depth: '_:0',
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
  })
})
