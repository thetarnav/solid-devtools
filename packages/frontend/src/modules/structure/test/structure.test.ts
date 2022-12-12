import { describe, expect, test } from 'vitest'
import { NodeID, NodeType, StructureUpdates } from '@solid-devtools/debugger/types'
import { reconcileStructure, Structure } from '..'

describe('reconcileStructure', () => {
  let updated: StructureUpdates['updated'] = {
    '1': {
      '1': {
        id: '1',
        type: NodeType.Root,
        children: [
          { id: '2', name: 'child', type: NodeType.Component, children: [] },
          {
            id: '3',
            name: 'child2',
            type: NodeType.Effect,
            children: [
              { id: '4', name: 'child3', type: NodeType.Component, children: [] },
              {
                id: '5',
                type: NodeType.Root,
                children: [{ id: '6', name: 'child4', type: NodeType.Component, children: [] }],
              },
            ],
          },
        ],
      },
    },
  }
  let removed: NodeID[] = []

  let prevRoots: Structure.Node[] = []

  test('initial', () => {
    const { roots, nodeList } = reconcileStructure(prevRoots, { updated, removed })
    prevRoots = roots

    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '2' }, { id: '3' }] },
      { id: '2', parent: { id: '1' }, level: 1, children: [] },
      {
        id: '3',
        parent: { id: '1' },
        level: 1,
        children: [{ id: '4' }, { id: '5' }],
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
                { id: '4', name: 'child3', type: NodeType.Component, children: [] },
                {
                  // removed child (6)
                  id: '5',
                  type: NodeType.Root,
                  children: [],
                },
              ],
            },
          ],
        },
      },
      // added new top-level root (10)
      '10': {
        '10': {
          id: '10',
          type: NodeType.Root,
          children: [],
        },
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, { updated, removed })
    prevRoots = roots

    expect(nodeList).toHaveLength(5)
    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '3' }] },
      {
        id: '3',
        parent: { id: '1' },
        level: 1,
        children: [{ id: '4' }, { id: '5' }],
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
      '1': {
        '3': {
          id: '3',
          name: 'child2',
          type: NodeType.Effect,
          frozen: true,
          children: [
            { id: '4', name: 'child3', type: NodeType.Component, children: [] },
            // removed attachment (5)
          ],
        },
      },
      // add new root (8)
      '8': {
        '8': {
          id: '8',
          type: NodeType.Root,
          children: [
            { id: '9', name: 'child6', type: NodeType.Component, children: [] },
            {
              // changed attachment from 3 to 8
              id: '5',
              type: NodeType.Root,
              children: [
                // add two children (6, 7)
                { id: '6', name: 'child4', type: NodeType.Component, children: [] },
                { id: '7', name: 'child5', type: NodeType.Effect, children: [] },
              ],
            },
          ],
        },
      },
    }

    removed = ['10']

    const { roots, nodeList } = reconcileStructure(prevRoots, { updated, removed })
    prevRoots = roots

    expect(nodeList).toHaveLength(8)
    expect(nodeList).toMatchObject([
      { id: '1', parent: null, level: 0, children: [{ id: '3' }] },
      { id: '3', parent: { id: '1' }, level: 1, children: [{ id: '4' }] },
      { id: '4', parent: { id: '3' }, level: 2, children: [] },
      { id: '8', parent: null, level: 0, children: [{ id: '9' }, { id: '5' }] },
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
      '8': {
        '8': {
          id: '8',
          type: NodeType.Root,
          children: [
            {
              id: '9',
              name: 'child6',
              type: NodeType.Component,
              children: [
                // add new subroot (12) attached to 9
                {
                  id: '12',
                  type: NodeType.Root,
                  children: [],
                },
              ],
            },
            // removed attachment (5)
          ],
        },
      },
      // remove attachment from 8 (now a top-level root)
      '5': {
        '5': {
          id: '5',
          type: NodeType.Root,
          children: [
            { id: '6', name: 'child4', type: NodeType.Component, children: [] },
            {
              id: '7',
              name: 'child5',
              type: NodeType.Effect,
              // add a child (11)
              children: [{ id: '11', name: 'child7', type: NodeType.Computation, children: [] }],
            },
          ],
        },
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, { updated, removed })
    prevRoots = roots

    expect(nodeList).toHaveLength(7)
    expect(nodeList).toMatchObject([
      { id: '8', parent: null, level: 0, children: [{ id: '9' }] },
      { id: '9', parent: { id: '8' }, level: 1, children: [{ id: '12' }] },
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
    removed = []
    updated = {
      '8': {
        '9': {
          id: '9',
          name: 'child6',
          type: NodeType.Component,
          children: [
            // removed attached root (12)
          ],
        },
      },
    }

    const { roots, nodeList } = reconcileStructure(prevRoots, { updated, removed })
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
