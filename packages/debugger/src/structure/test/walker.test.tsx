import {
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
} from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeType, TreeWalkerMode } from '../../main/constants'
import { $setSdtId, ObjectType, getSdtId } from '../../main/id'
import SolidApi from '../../main/solid-api'
import { Mapped, Solid } from '../../main/types'
import { getNodeName } from '../../main/utils'
import { ComputationUpdateHandler, walkSolidTree } from '../walker'

const { getOwner } = SolidApi

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/get-id', () => ({ getNewSdtId: () => '#' + mockLAST_ID++ }))

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

describe('TreeWalkerMode.Owners', () => {
  it('default options', () => {
    {
      const [dispose, owner] = createRoot(_dispose => {
        mockTree()
        return [_dispose, getOwner()! as Solid.Root]
      })

      const tree = walkSolidTree(owner, {
        onComputationUpdate: () => {},
        rootId: $setSdtId(owner, '#ff'),
        registerComponent: () => {},
        mode: TreeWalkerMode.Owners,
      })

      dispose()

      expect(tree).toEqual({
        id: '#ff',
        type: NodeType.Root,
        children: [
          {
            id: expect.any(String),
            name: 'e0',
            type: NodeType.Effect,
            frozen: true,
            children: [
              { id: expect.any(String), name: 'c0', type: NodeType.Computation, children: [] },
              {
                id: expect.any(String),
                name: 'c1',
                type: NodeType.Computation,
                frozen: true,
                children: [],
              },
            ],
          },
        ],
      } satisfies Mapped.Owner)
      expect(tree, 'is json serializable').toEqual(JSON.parse(JSON.stringify(tree)))
    }

    {
      createRoot(dispose => {
        const [s] = createSignal(0, { name: 'source' })

        const div = document.createElement('div')

        createComputed(
          () => {
            const focused = createMemo(
              () => {
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
        const tree = walkSolidTree(rootOwner, {
          rootId: $setSdtId(rootOwner, '#0'),
          onComputationUpdate: () => {},
          registerComponent: () => {},
          mode: TreeWalkerMode.Owners,
        })

        expect(tree).toEqual({
          id: expect.any(String),
          type: NodeType.Root,
          name: undefined,
          children: [
            {
              id: expect.any(String),
              name: 'WRAPPER',
              type: NodeType.Computation,
              children: [
                {
                  id: expect.any(String),
                  name: 'focused',
                  type: NodeType.Memo,
                  children: [
                    {
                      id: expect.any(String),
                      name: 'memo',
                      type: NodeType.Memo,
                      frozen: true,
                      children: [],
                    },
                    {
                      id: expect.any(String),
                      name: 'render',
                      type: NodeType.Render,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        } satisfies Mapped.Owner)

        dispose()
      })
    }
  })

  it('listen to computation updates', () => {
    createRoot(dispose => {
      const capturedComputationUpdates: Parameters<ComputationUpdateHandler>[] = []

      let computedOwner!: Solid.Owner
      const [a, setA] = createSignal(0)
      createComputed(() => {
        computedOwner = getOwner()!
        a()
      })

      const owner = getOwner()! as Solid.Root
      walkSolidTree(owner, {
        onComputationUpdate: (...args) => capturedComputationUpdates.push(args),
        rootId: $setSdtId(owner, '#ff'),
        mode: TreeWalkerMode.Owners,
        registerComponent: () => {},
      })

      expect(capturedComputationUpdates.length).toBe(0)

      setA(1)

      expect(capturedComputationUpdates.length).toBe(1)
      expect(capturedComputationUpdates[0]).toEqual([
        '#ff',
        computedOwner,
        getSdtId(computedOwner, ObjectType.Owner),
        false,
      ])

      dispose()
    })
  })

  it('gathers components', () => {
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

      const components: string[] = []

      walkSolidTree(owner, {
        onComputationUpdate: () => {},
        rootId: $setSdtId(owner, '#ff'),
        mode: TreeWalkerMode.Owners,
        registerComponent: c => {
          if (!('owner' in c)) return
          const name = getNodeName(c.owner)
          name && components.push(name)
        },
      })

      expect(components.length).toBe(7)

      let testCompsLength = 0
      let btn!: string
      components.forEach(c => {
        if (c === 'TestComponent') testCompsLength++
        else if (c === 'Button') btn = c
      })
      expect(testCompsLength).toBe(6)
      expect(btn).toBeTruthy()

      dispose()
    })
  })
})

describe('TreeWalkerMode.Components', () => {
  it('map component tree', () => {
    const toTrigger: VoidFunction[] = []
    const testComponents: Solid.Component[] = []

    createRoot(dispose => {
      const Wrapper = (props: { children: any }) => {
        return <div>{props.children}</div>
      }
      const TestComponent = (props: { n: number }) => {
        const [a, set] = createSignal(0)
        createComputed(a)
        toTrigger.push(() => set(1))
        testComponents.push(getOwner()! as Solid.Component)
        return createRoot(_ => (
          <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
        ))
      }
      const Button = () => {
        return <button>Click me</button>
      }

      createRenderEffect(() => {
        return (
          <>
            <Wrapper>
              <TestComponent n={3} />
              <Button />
            </Wrapper>
          </>
        )
      })

      const owner = getOwner()! as Solid.Root

      const computationUpdates: Parameters<ComputationUpdateHandler>[] = []

      const tree = walkSolidTree(owner, {
        onComputationUpdate: (...a) => computationUpdates.push(a),
        rootId: $setSdtId(owner, '#ff'),
        mode: TreeWalkerMode.Components,
        registerComponent: () => {},
      })

      expect(tree).toMatchObject({
        type: NodeType.Root,
        children: [
          {
            type: NodeType.Component,
            name: 'Wrapper',
            children: [
              {
                type: NodeType.Component,
                name: 'TestComponent',
                children: [
                  {
                    type: NodeType.Component,
                    name: 'TestComponent',
                    children: [
                      {
                        type: NodeType.Component,
                        name: 'TestComponent',
                        children: [
                          {
                            type: NodeType.Component,
                            name: 'TestComponent',
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: NodeType.Component,
                name: 'Button',
                children: [],
              },
            ],
          },
        ],
      })

      expect(computationUpdates.length).toBe(0)

      toTrigger.forEach(t => t())

      expect(computationUpdates.length).toBe(4)

      for (let i = 0; i < 4; i++) {
        expect(computationUpdates[i]).toEqual([
          '#ff',
          testComponents[i],
          getSdtId(testComponents[i]!, ObjectType.Owner),
          false,
        ])
      }

      dispose()
    })
  })
})

describe('TreeWalkerMode.DOM', () => {
  it('map dom tree', () => {
    const toTrigger: VoidFunction[] = []
    const testComponents: Solid.Component[] = []

    createRoot(dispose => {
      const Wrapper = (props: { children: any }) => {
        return <div>{props.children}</div>
      }
      const TestComponent = (props: { n: number }) => {
        const [a, set] = createSignal(0)
        createComputed(a)
        toTrigger.push(() => set(1))
        testComponents.push(getOwner()! as Solid.Component)
        return createRoot(_ => (
          <div>{props.n === 0 ? 'end' : <TestComponent n={props.n - 1} />}</div>
        ))
      }
      const Button = () => {
        return <button>Click me</button>
      }
      const App = () => {
        return (
          <>
            <Wrapper>
              <main>
                <TestComponent n={2} />
                <Button />
              </main>
            </Wrapper>
            <footer />
          </>
        )
      }
      createRenderEffect(() => <App />)

      const owner = getOwner()! as Solid.Root

      const computationUpdates: Parameters<ComputationUpdateHandler>[] = []

      const tree = walkSolidTree(owner, {
        onComputationUpdate: (...a) => computationUpdates.push(a),
        rootId: $setSdtId(owner, '#ff'),
        mode: TreeWalkerMode.DOM,
        registerComponent: () => {},
      })

      expect(tree).toMatchObject({
        type: NodeType.Root,
        children: [
          {
            type: NodeType.Component,
            name: 'App',
            children: [
              {
                type: NodeType.Component,
                name: 'Wrapper',
                children: [
                  {
                    type: NodeType.Element,
                    name: 'div',
                    children: [
                      {
                        type: NodeType.Element,
                        name: 'main',
                        children: [
                          {
                            type: NodeType.Component,
                            name: 'TestComponent',
                            children: [
                              {
                                type: NodeType.Element,
                                name: 'div',
                                children: [
                                  {
                                    type: NodeType.Component,
                                    name: 'TestComponent',
                                    children: [
                                      {
                                        type: NodeType.Element,
                                        name: 'div',
                                        children: [
                                          {
                                            type: NodeType.Component,
                                            name: 'TestComponent',
                                            children: [
                                              {
                                                type: NodeType.Element,
                                                name: 'div',
                                                children: [],
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            type: NodeType.Component,
                            name: 'Button',
                            children: [
                              {
                                type: NodeType.Element,
                                name: 'button',
                                children: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: NodeType.Element,
                name: 'footer',
                children: [],
              },
            ],
          },
        ],
      })

      expect(computationUpdates.length).toBe(0)

      toTrigger.forEach(t => t())

      for (let i = 0; i < 3; i++) {
        expect(computationUpdates[i]).toEqual([
          '#ff',
          testComponents[i],
          getSdtId(testComponents[i]!, ObjectType.Owner),
          true,
        ])
      }

      dispose()
    })
  })
})
