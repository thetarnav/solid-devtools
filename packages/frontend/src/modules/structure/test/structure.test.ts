import type { Structure } from '..'
import { reconcileStructure } from '../structure-reconcile'
import { describe, expect, test } from 'vitest'
import { Mapped, NodeID, NodeType } from '@solid-devtools/debugger/types'

describe('reconcileStructure', () => {
  let updated: Record<NodeID, Mapped.Root> = {
    '1': {
      id: '1',
      type: NodeType.Root,
      children: [
        { id: '2', name: 'child', type: NodeType.Component, children: [], hmr: false },
        {
          id: '3',
          name: 'child2',
          type: NodeType.Effect,
          children: [
            { id: '4', name: 'child3', type: NodeType.Component, children: [], hmr: false },
          ],
        },
      ],
    },
    '5': {
      id: '5',
      type: NodeType.Root,
      children: [{ id: '6', name: 'child4', type: NodeType.Component, children: [], hmr: false }],
      attached: '3',
    },
  }
  let removed: NodeID[] = []

  let prevRoots: Structure.Node[] = []

  test('initial', () => {
    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '2' }, { id: '3' }] },
      { id: '2', parent: { id: '1' }, level: 1, children: [] },
      {
        id: '3',
        parent: { id: '1' },
        level: 1,
        children: [{ id: '4' }],
        subroots: [{ id: '5' }],
      },
      { id: '4', parent: { id: '3' }, level: 2, children: [] },
      { id: '5', parent: { id: '3' }, level: 2, children: [{ id: '6' }] },
      { id: '6', parent: { id: '5' }, level: 3, children: [] },
    ])

    expect(roots).toMatchObject([{ id: '1' }])
  })

  test('update', () => {
    updated = {
      '1': {
        id: '1',
        type: NodeType.Root,
        children: [
          // removed child (2)
          {
            id: '3',
            name: 'child2',
            type: NodeType.Effect,
            frozen: true,
            children: [
              { id: '4', name: 'child3', type: NodeType.Component, children: [], hmr: false },
            ],
          },
        ],
      },
      // added new top-level root (10)
      '10': {
        id: '10',
        type: NodeType.Root,
        children: [],
      },
      '5': {
        // removed child (6)
        id: '5',
        type: NodeType.Root,
        children: [],
        attached: '3',
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(5)
    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '3' }] },
      {
        id: '3',
        parent: { id: '1' },
        level: 1,
        children: [{ id: '4' }],
        subroots: [{ id: '5' }],
        frozen: true,
      },
      { id: '4', parent: { id: '3' }, level: 2, children: [] },
      { id: '5', parent: { id: '3' }, level: 2, children: [] },
      { id: '10', parent: null, level: 0, children: [] },
    ])

    expect(roots).toMatchObject([{ id: '1' }, { id: '10' }])
  })

  test('attach to a different node', () => {
    // UPDATE 2
    updated = {
      '5': {
        // changed attachment from 3 to 8
        attached: '8',
        id: '5',
        type: NodeType.Root,
        children: [
          // add two children (6, 7)
          { id: '6', name: 'child4', type: NodeType.Component, children: [], hmr: false },
          { id: '7', name: 'child5', type: NodeType.Effect, children: [] },
        ],
      },
      // add new root (8)
      '8': {
        id: '8',
        type: NodeType.Root,
        children: [{ id: '9', name: 'child6', type: NodeType.Component, children: [], hmr: false }],
      },
    }

    removed = ['10']

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(8)
    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '3' }] },
      { id: '3', parent: { id: '1' }, level: 1, children: [{ id: '4' }] },
      { id: '4', parent: { id: '3' }, level: 2, children: [] },
      { id: '8', parent: null, level: 0, children: [{ id: '9' }], subroots: [{ id: '5' }] },
      { id: '9', parent: { id: '8' }, level: 1, children: [] },
      { id: '5', parent: { id: '8' }, level: 1, children: [{ id: '6' }, { id: '7' }] },
      { id: '6', parent: { id: '5' }, level: 2, children: [] },
      { id: '7', parent: { id: '5' }, level: 2, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe('1')
    expect(roots[1].id).toBe('8')
  })

  test('remove attachment', () => {
    removed = ['1']

    updated = {
      // remove attachment from 8
      '5': {
        id: '5',
        type: NodeType.Root,
        children: [
          { id: '6', name: 'child4', type: NodeType.Component, children: [], hmr: false },
          {
            id: '7',
            name: 'child5',
            type: NodeType.Effect,
            // add a child (11)
            children: [{ id: '11', name: 'child7', type: NodeType.Computation, children: [] }],
          },
        ],
      },
      // add new subroot (12) attached to 9
      '12': {
        id: '12',
        type: NodeType.Root,
        children: [],
        attached: '9',
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(7)
    expect(nodeList).toMatchObject([
      { id: '8', parent: null, level: 0, children: [{ id: '9' }] },
      { id: '9', parent: { id: '8' }, level: 1, children: [], subroots: [{ id: '12' }] },
      { id: '12', parent: { id: '9' }, level: 2, children: [] },
      { id: '5', parent: null, level: 0, children: [{ id: '6' }, { id: '7' }] },
      { id: '6', parent: { id: '5' }, level: 1, children: [] },
      { id: '7', parent: { id: '5' }, level: 1, children: [{ id: '11' }] },
      { id: '11', parent: { id: '7' }, level: 2, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe('8')
    expect(roots[1].id).toBe('5')
  })

  test('remove attached node', () => {
    removed = ['12']
    updated = {}

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, removed)
    prevRoots = roots

    expect(nodeList).toHaveLength(6)
    expect(nodeList).toMatchObject([
      { id: '8', parent: null, level: 0, children: [{ id: '9' }] },
      { id: '9', parent: { id: '8' }, level: 1, children: [] },
      { id: '5', parent: null, level: 0, children: [{ id: '6' }, { id: '7' }] },
      { id: '6', parent: { id: '5' }, level: 1, children: [] },
      { id: '7', parent: { id: '5' }, level: 1, children: [{ id: '11' }] },
      { id: '11', parent: { id: '7' }, level: 2, children: [] },
    ])

    expect(roots).toHaveLength(2)
    expect(roots[0].id).toBe('8')
    expect(roots[1].id).toBe('5')
  })
})

describe('mapArray example', () => {
  test('items keeping their position after update', () => {
    const n1: Structure.Node = {
      id: '1',
      name: 'root',
      type: NodeType.Root,
      level: 0,
      parent: null,
      children: [],
    }
    const n2: Structure.Node = {
      id: '2',
      name: 'For',
      type: NodeType.Component,
      level: 1,
      parent: n1,
      children: [],
    }
    const n3: Structure.Node = {
      id: '3',
      name: 'item1',
      type: NodeType.Root,
      level: 2,
      parent: n2,
      children: [],
    }
    const n4: Structure.Node = {
      id: '4',
      name: 'item2',
      type: NodeType.Root,
      level: 2,
      parent: n2,
      children: [],
    }
    const n5: Structure.Node = {
      id: '5',
      name: 'item3',
      type: NodeType.Root,
      level: 2,
      parent: n2,
      children: [],
    }
    ;(n1 as any).children = [n2]
    ;(n2 as any).subroots = [n3, n4, n5]

    const updated: Record<NodeID, Mapped.Root> = {
      '3': { id: '3', type: NodeType.Root, children: [], attached: '2' },
    }

    const prevRoots: Structure.Node[] = [n1]
    const prevNodeList: Structure.Node[] = [n1, n2, n3, n4, n5]

    const { roots, nodeList } = reconcileStructure(prevRoots, updated, [])

    expect(roots).toEqual(prevRoots)
    expect(nodeList).toEqual(prevNodeList)
  })
})
