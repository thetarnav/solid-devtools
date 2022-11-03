import { describe, beforeEach, vi, it, expect } from 'vitest'
import {
  createComputed,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  JSX,
} from 'solid-js'
import {
  createMutable,
  createStore,
  produce,
  reconcile,
  unwrap,
  modifyMutable,
} from 'solid-js/store'
import { NodeType, ValueType } from '@solid-devtools/shared/graph'
import { Solid } from '../src/types'
import { getOwner, isSolidStore } from '../src/utils'

const getInspectModule = async () => await import('../src/inspector')

describe('collectOwnerDetails', () => {
  beforeEach(() => {
    delete (window as any).Solid$$
    vi.resetModules()
  })

  it('collects focused owner details', async () => {
    const { collectOwnerDetails } = await getInspectModule()

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

      const { details, valueMap, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: 'ff',
        name: 'focused',
        type: NodeType.Memo,
        value: { type: ValueType.String, value: 'value' },
        sources: ['3'],
        observers: ['4'],
        signals: [
          {
            type: NodeType.Signal,
            id: '0',
            name: 'element',
            observers: [],
            value: { type: ValueType.Element, value: { name: 'DIV', id: '0' } },
          },
          {
            type: NodeType.Memo,
            id: '1',
            name: 'memo',
            observers: ['2'],
            value: { type: ValueType.Number, value: 0 },
          },
        ],
      })

      expect(valueMap.get('signal:0')).toBeTruthy()
      expect(valueMap.get('signal:1')).toBeTruthy()

      expect(nodeIdMap.get('0')).toBe(div)

      dispose()
    })
  })

  it('component props', async () => {
    const { collectOwnerDetails } = await getInspectModule()

    createRoot(dispose => {
      let owner!: Solid.Owner
      const TestComponent = (props: {
        count: number
        children: JSX.Element
        nested: { foo: number; bar: string }
      }) => {
        owner = getOwner()!
        return <div>{props.children}</div>
      }
      createRenderEffect(() => (
        <TestComponent count={123} nested={{ foo: 1, bar: '2' }}>
          <button>Click me</button>
        </TestComponent>
      ))

      const { details, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      dispose()

      expect(details).toEqual({
        id: '0',
        name: 'TestComponent',
        type: NodeType.Component,
        signals: [],
        sources: [],
        value: { type: ValueType.Element, value: { id: '1', name: 'DIV' } },
        props: {
          proxy: false,
          record: {
            count: { type: ValueType.Number, value: 123 },
            children: { type: ValueType.Getter, value: 'children' },
            nested: { type: ValueType.Object, value: 2 },
          },
        },
      })

      expect(nodeIdMap.get('1')).toBeInstanceOf(HTMLDivElement)
    })
  })

  it('dynamic component props', async () => {
    const { collectOwnerDetails } = await getInspectModule()

    createRoot(dispose => {
      let owner!: Solid.Owner
      const Button = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
        owner = getOwner()!
        return <button {...props}>Click me</button>
      }
      createRenderEffect(() => {
        const props = () => ({ onClick: () => {}, role: 'button' } as const)
        return <Button {...props()} />
      })

      const { details, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: '0',
        name: 'Button',
        type: NodeType.Component,
        signals: [],
        sources: [],
        value: { type: ValueType.Element, value: { id: '2', name: 'BUTTON' } },
        props: {
          // ! this should be true, don't know what's the reason. it's working in the browser
          proxy: true,
          record: {
            onClick: { type: ValueType.Getter, value: 'onClick' },
            role: { type: ValueType.Getter, value: 'role' },
          },
        },
      })

      expect(nodeIdMap.get('2')).toBeInstanceOf(HTMLButtonElement)

      dispose()
    })
  })

  it('listens to value updates', async () => {
    const { collectOwnerDetails } = await getInspectModule()

    createRoot(dispose => {
      let owner!: Solid.Owner

      const [count, setCount] = createSignal(0)
      createMemo(() => {
        owner = getOwner()!
        return count()
      })

      const onValueUpdate = vi.fn()
      collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: onValueUpdate,
      })

      expect(onValueUpdate).not.toBeCalled()

      setCount(1)
      expect(onValueUpdate).toBeCalledTimes(1)
      expect(onValueUpdate).toBeCalledWith(1, 0)

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)
      expect(onValueUpdate).toBeCalledWith(2, 1)

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)

      dispose()
    })
  })

  it('listens to signal updates', async () => {
    const { collectOwnerDetails } = await getInspectModule()

    createRoot(dispose => {
      let owner = getOwner()!
      const [, setCount] = createSignal(0) // id: "0"
      const [, setCount2] = createSignal(0) // id: "1"

      const onSignalUpdate = vi.fn()
      collectOwnerDetails(owner, {
        onSignalUpdate: onSignalUpdate,
        onValueUpdate: () => {},
      })

      expect(onSignalUpdate).not.toBeCalled()

      setCount(1)
      expect(onSignalUpdate).toBeCalledTimes(1)
      expect(onSignalUpdate).toBeCalledWith('0', 1)

      setCount(1)
      expect(onSignalUpdate).toBeCalledTimes(1)

      setCount2(1)
      expect(onSignalUpdate).toBeCalledTimes(2)
      expect(onSignalUpdate).toBeCalledWith('1', 1)

      dispose()
    })
  })
})

const getOwnerStore = () =>
  (Object.values(getOwner()!.sourceMap!).find(s => isSolidStore(s))! as Solid.Store).value

describe.only('inspectStore', async () => {
  const { inspectStoreNode } = await getInspectModule()

  it('listens to simple store updates', () => {
    createRoot(dispose => {
      const [state, setState] = createStore<any>({ count: 0 })
      const store = getOwnerStore()
      const cb = vi.fn<Parameters<StoreUpdateHandler>, void>()
      const unsub = inspectStoreNode(store, cb)
      expect(cb).not.toBeCalled()

      setState({ count: 1 })
      expect(cb).toBeCalledTimes(1)
      let args: Parameters<StoreUpdateHandler>[0] = {
        deleting: false,
        path: [],
        property: 'count',
        value: 1,
      }
      expect(cb).toBeCalledWith(args)

      setState('count', 2)
      expect(cb).toBeCalledTimes(2)
      args = {
        deleting: false,
        path: [],
        property: 'count',
        value: 2,
      }
      expect(cb).toBeCalledWith(args)

      setState(reconcile({}))
      expect(cb).toBeCalledTimes(3)
      args = {
        deleting: false,
        path: [],
        property: 'count',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      setState({ a: { foo: 123, bar: [1, 2, 3] }, b: 'hello' })
      expect(cb).toBeCalledTimes(5)
      args = {
        deleting: false,
        path: [],
        property: 'a',
        value: unwrap(state.a),
      }
      expect(cb).toHaveBeenNthCalledWith(4, args)
      args = {
        deleting: false,
        path: [],
        property: 'b',
        value: 'hello',
      }
      expect(cb).toHaveBeenNthCalledWith(5, args)

      setState(produce((proxy: any) => delete proxy.a.foo))
      expect(cb).toBeCalledTimes(6)
      args = {
        deleting: true,
        path: ['a'],
        property: 'foo',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      setState(produce((proxy: any) => proxy.a.bar.push(4)))
      expect(cb).toBeCalledTimes(7)
      args = {
        deleting: false,
        path: ['a', 'bar'],
        property: '3',
        value: 4,
      }
      expect(cb).toBeCalledWith(args)

      unsub()
      setState({ count: 3 })
      expect(cb).toBeCalledTimes(7)

      dispose()
    })
  })

  it('listens to mutable', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ count: 0 })
      const store = getOwnerStore()
      const cb = vi.fn<Parameters<StoreUpdateHandler>, void>()
      const unsub = inspectStoreNode(store, cb)
      expect(cb).not.toBeCalled()

      state.count = 1
      expect(cb).toBeCalledTimes(1)
      let args: Parameters<StoreUpdateHandler>[0] = {
        deleting: false,
        path: [],
        property: 'count',
        value: 1,
      }
      expect(cb).toBeCalledWith(args)

      modifyMutable(state, reconcile({}))
      expect(cb).toBeCalledTimes(2)
      args = {
        deleting: false,
        path: [],
        property: 'count',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      state.a = { foo: 123, bar: [1, 2, 3] }
      expect(cb).toBeCalledTimes(3)
      args = {
        deleting: false,
        path: [],
        property: 'a',
        value: unwrap(state.a),
      }
      expect(cb).toBeCalledWith(args)

      delete state.a.foo
      expect(cb).toBeCalledTimes(4)
      args = {
        deleting: true,
        path: ['a'],
        property: 'foo',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      state.a.bar.push(4)
      expect(cb).toBeCalledTimes(5)
      args = {
        deleting: false,
        path: ['a', 'bar'],
        property: '3',
        value: 4,
      }
      expect(cb).toBeCalledWith(args)

      unsub()
      state.count = 3
      expect(cb).toBeCalledTimes(5)

      dispose()
    })
  })

  it('ignores updates to removed object', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ a: { foo: 123, bar: [1, 2, 3] } })
      const store = getOwnerStore()
      const cb = vi.fn<Parameters<StoreUpdateHandler>, void>()
      const unsub = inspectStoreNode(store, cb)

      const detached = state.a.bar

      const a1 = (state.a = { other: 'hello' })
      let args: Parameters<StoreUpdateHandler>[0] = {
        deleting: false,
        path: [],
        property: 'a',
        value: a1,
      }
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(args)

      detached.push(4)
      expect(cb).toBeCalledTimes(1)

      state.a.bar = detached
      args = {
        deleting: false,
        path: ['a'],
        property: 'bar',
        value: detached,
      }
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(args)

      delete state.a.bar
      args = {
        deleting: true,
        path: ['a'],
        property: 'bar',
        value: undefined,
      }
      expect(cb).toBeCalledTimes(3)
      expect(cb).toBeCalledWith(args)

      detached.push(5)
      expect(cb).toBeCalledTimes(3)

      unsub()
      state.a.baz = "I'm back!"
      expect(cb).toBeCalledTimes(3)

      dispose()
    })
  })

  it('handles multiple inspected nodes', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ a: { foo: 123, bar: [1, 2, 3] } })
      const rootCb = vi.fn()
      const unsubRoot = inspectStoreNode(getOwnerStore(), rootCb)

      const cb = vi.fn()
      const unsubBranch = inspectStoreNode(unwrap(state.a.bar), cb)

      state.a.bar.push(4)
      let args: Parameters<StoreUpdateHandler>[0] = {
        deleting: false,
        path: ['a', 'bar'],
        property: '3',
        value: 4,
      }
      expect(rootCb).toBeCalledTimes(1)
      expect(rootCb).toBeCalledWith(args)
      args = {
        deleting: false,
        path: [],
        property: '3',
        value: 4,
      }
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(args)

      const arr = state.a.bar
      delete state.a.bar
      args = {
        deleting: true,
        path: ['a'],
        property: 'bar',
        value: undefined,
      }
      expect(rootCb).toBeCalledTimes(2)
      expect(rootCb).toBeCalledWith(args)
      expect(cb).toBeCalledTimes(1)

      arr.push(5)
      expect(rootCb).toBeCalledTimes(2)
      args = {
        deleting: false,
        path: [],
        property: '4',
        value: 5,
      }
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(args)

      unsubBranch()
      arr.push(6)
      unsubRoot()
      state.baz = 'hello'
      expect(rootCb).toBeCalledTimes(2)
      expect(cb).toBeCalledTimes(2)

      dispose()
    })
  })
})
