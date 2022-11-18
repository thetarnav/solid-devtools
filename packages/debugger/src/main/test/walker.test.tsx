import { describe, beforeEach, vi, it, expect } from 'vitest'
import {
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  Show,
} from 'solid-js'
import { getOwner } from '../utils'
import { Solid, Mapped } from '../types'
import { NodeType } from '../constants'
import { render } from 'solid-js/web'

const getModule = async () => (await import('../walker')).walkSolidTree

const mockTree = () => {
  const [s] = createSignal('foo', { name: 's0' })
  createSignal('hello', { name: 's1' })

  createEffect(
    () => {
      createSignal({ bar: 'baz' }, { name: 's2' })
      createComputed(s, undefined, { name: 'c0' })
      createComputed(() => createSignal(0, { name: 's3' }), undefined, { name: 'c1' })
    },
    undefined,
    { name: 'e0' },
  )
}

describe('walkSolidTree', () => {
  beforeEach(() => {
    delete (window as any).Solid$$
    vi.resetModules()
  })

  it('default options', async () => {
    const walkSolidTree = await getModule()

    const [dispose, owner] = createRoot(dispose => {
      mockTree()
      return [dispose, getOwner()! as Solid.Root]
    })

    const { root, components, inspectedOwner } = walkSolidTree(owner, {
      onComputationUpdate: () => {},
      rootId: (owner.sdtId = 'ff'),
      inspectedId: null,
      gatherComponents: false,
    })

    dispose()

    expect(root).toEqual({
      id: 'ff',
      type: NodeType.Root,
      children: [
        {
          id: '0',
          name: 'e0',
          type: NodeType.Effect,
          frozen: true,
          children: [
            { id: '1', name: 'c0', type: NodeType.Computation },
            { id: '2', name: 'c1', type: NodeType.Computation, frozen: true },
          ],
        },
      ],
    })
    expect(root).toEqual(JSON.parse(JSON.stringify(root)))
    expect(components).toEqual([])
    expect(inspectedOwner).toBe(null)
  })

  it('listen to computation updates', async () => {
    const walkSolidTree = await getModule()

    createRoot(dispose => {
      const capturedComputationUpdates: [string, string][] = []

      const [a, setA] = createSignal(0)
      createComputed(a)

      const owner = getOwner()! as Solid.Root
      walkSolidTree(owner, {
        onComputationUpdate: (rootId, id) => capturedComputationUpdates.push([rootId, id]),
        rootId: (owner.sdtId = 'ff'),
        inspectedId: null,
        gatherComponents: false,
      })

      expect(capturedComputationUpdates.length).toBe(0)

      setA(1)

      expect(capturedComputationUpdates.length).toBe(1)
      expect(capturedComputationUpdates[0]).toEqual(['ff', '0'])

      dispose()
    })
  })

  it('gathers components', async () => {
    const walkSolidTree = await getModule()

    createRoot(dispose => {
      const TestComponent = (props: { n: number }) => {
        const [a] = createSignal(0)
        createComputed(a)
        return <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
      }
      const Button = () => {
        return <button>Click me</button>
      }

      createRenderEffect(() => {
        return (
          <>
            <TestComponent n={5} />
            <Button />
          </>
        )
      })

      const owner = getOwner()! as Solid.Root
      const { components } = walkSolidTree(owner, {
        onComputationUpdate: () => {},
        rootId: (owner.sdtId = 'ff'),
        inspectedId: null,
        gatherComponents: true,
      })

      expect(components.length).toBe(7)

      let testCompsLength = 0
      let btn!: Mapped.ResolvedComponent
      components.forEach(c => {
        if (c.name === 'TestComponent' && c.element instanceof HTMLDivElement) testCompsLength++
        else btn = c
      })
      expect(testCompsLength).toBe(6)

      expect(btn).toBeTruthy()
      expect(btn.name).toBe('Button')
      expect(btn.element).toBeInstanceOf(HTMLButtonElement)

      dispose()
    })
  })

  it('returns inspected owner', async () => {
    const walkSolidTree = await getModule()

    createRoot(dispose => {
      const [s] = createSignal(0, { name: 'source' })

      let owner!: Solid.Owner
      const div = document.createElement('div')

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              owner.sdtId = 'ff'
              s()
              createSignal(div, { name: 'element' })
              const memo = createMemo(() => 0, undefined, { name: 'memo' })
              createRenderEffect(memo, undefined, { name: 'render' })
              return 'value'
            },
            undefined,
            { name: 'focused' },
          )
          focused()
        },
        undefined,
        { name: 'WRAPPER' },
      )

      const rootOwner = getOwner()! as Solid.Root
      const { root, inspectedOwner } = walkSolidTree(rootOwner, {
        rootId: (rootOwner.sdtId = '0'),
        inspectedId: 'ff',
        onComputationUpdate: () => {},
        gatherComponents: false,
      })

      expect(owner).toBe(inspectedOwner)

      expect(root).toEqual({
        id: '0',
        type: NodeType.Root,
        children: [
          {
            id: '0',
            name: 'WRAPPER',
            type: NodeType.Computation,
            children: [
              {
                id: 'ff',
                name: 'focused',
                type: NodeType.Memo,
                children: [
                  { id: '1', name: 'memo', type: NodeType.Memo, frozen: true },
                  { id: '2', type: NodeType.Render },
                ],
              },
            ],
          },
        ],
      })

      dispose()
    })
  })

  it('Hides <Show> implementation memos', async () => {
    const walkSolidTree = await getModule()

    let rootOwner!: Solid.Root
    const rootDiv = document.createElement('div')
    const dispose = render(() => {
      rootOwner = getOwner()! as Solid.Root
      return (
        <Show when={true}>
          <div>{rootOwner.name}</div>
        </Show>
      )
    }, rootDiv)

    const { root } = walkSolidTree(rootOwner, {
      rootId: (rootOwner.sdtId = '0'),
      inspectedId: null,
      onComputationUpdate: () => {},
      gatherComponents: false,
    })

    expect(root).toEqual({
      id: '0',
      type: NodeType.Root,
      children: [
        {
          id: '0',
          name: 'Show',
          type: NodeType.Component,
          frozen: true,
          children: [
            {
              id: '1',
              type: NodeType.Render,
              frozen: true,
            },
          ],
        },
        {
          id: '2',
          type: NodeType.Render,
        },
      ],
    })

    dispose()
  })
})
