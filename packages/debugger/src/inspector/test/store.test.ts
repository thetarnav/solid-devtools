import { createRoot } from 'solid-js'
import {
  createMutable,
  createStore,
  modifyMutable,
  produce,
  reconcile,
  unwrap,
} from 'solid-js/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOwner, isSolidStore, markNodeID } from '../../main/utils'
import { Core, Solid } from '../../types'
import { observeStoreNode, OnNodeUpdate, setOnStoreNodeUpdate, StoreNodeProperty } from '../store'

const getOwnerStore = () =>
  (Object.values(getOwner()!.sourceMap!).find(s => isSolidStore(s))! as Solid.Store).value

const getNodeProp = (node: Core.Store.StoreNode, prop: string): StoreNodeProperty =>
  `${markNodeID(node)}:${prop}`

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/id', () => ({ getNewSdtId: () => mockLAST_ID++ + '' }))

type UpdateParams = Parameters<OnNodeUpdate>

describe('observeStoreNode2', () => {
  it('listens to simple store updates', () => {
    createRoot(dispose => {
      const [state, setState] = createStore<any>({ count: 0 })
      const store = getOwnerStore()
      const cb = vi.fn<UpdateParams, void>()
      setOnStoreNodeUpdate(cb)
      const unsub = observeStoreNode(store)
      expect(cb).not.toBeCalled()

      setState({ count: 1 })
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'count'), { value: 1 }] satisfies UpdateParams),
      )

      setState('count', 2)
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'count'), { value: 2 }] satisfies UpdateParams),
      )

      setState(reconcile({}))
      expect(cb).toBeCalledTimes(3)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'count'), undefined] satisfies UpdateParams),
      )

      setState({ a: { foo: 123, bar: [1, 2, 3] }, b: 'hello' })
      expect(cb).toBeCalledTimes(5)
      expect(cb).toHaveBeenNthCalledWith(
        4,
        ...([getNodeProp(state, 'a'), { value: unwrap(state.a) }] satisfies UpdateParams),
      )
      expect(cb).toHaveBeenNthCalledWith(
        5,
        ...([getNodeProp(state, 'b'), { value: 'hello' }] satisfies UpdateParams),
      )

      setState(produce((proxy: any) => delete proxy.a.foo))
      expect(cb).toBeCalledTimes(6)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a, 'foo'), undefined] satisfies UpdateParams),
      )

      setState(produce((proxy: any) => proxy.a.bar.push(4)))
      expect(cb).toBeCalledTimes(7)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a.bar, '3'), { value: 4 }] satisfies UpdateParams),
      )

      unsub()
      setState({ count: 3 })
      setState(produce((proxy: any) => proxy.a.bar.push(5)))
      expect(cb).toBeCalledTimes(7)

      dispose()
    })
  })

  it('listens to mutable', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ count: 0 })
      const store = getOwnerStore()
      const cb = vi.fn<UpdateParams, void>()
      setOnStoreNodeUpdate(cb)
      const unsub = observeStoreNode(store)
      expect(cb).not.toBeCalled()

      state.count = 1
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'count'), { value: 1 }] satisfies UpdateParams),
      )

      modifyMutable(state, reconcile({}))
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'count'), undefined] satisfies UpdateParams),
      )

      state.a = { foo: 123, bar: [1, 2, 3] }
      expect(cb).toBeCalledTimes(3)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'a'), { value: unwrap(state.a) }] satisfies UpdateParams),
      )

      delete state.a.foo
      expect(cb).toBeCalledTimes(4)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a, 'foo'), undefined] satisfies UpdateParams),
      )

      state.a.bar.push(4)
      expect(cb).toBeCalledTimes(5)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a.bar, '3'), { value: 4 }] satisfies UpdateParams),
      )

      unsub()
      state.count = 3
      expect(cb).toBeCalledTimes(5)

      dispose()
    })
  })

  it('ignores updates to removed object', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ a: { foo: 123, bar: [1, 2, 3] } })

      const cb = vi.fn<UpdateParams, void>()
      setOnStoreNodeUpdate(cb)
      const unsub = observeStoreNode(getOwnerStore())

      const detached = state.a.bar

      const a1 = (state.a = { other: 'hello', bar: undefined })
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state, 'a'), { value: a1 }] satisfies UpdateParams),
      )

      detached.push(4)
      expect(cb).toBeCalledTimes(1)

      state.a.bar = detached
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a, 'bar'), { value: detached }] satisfies UpdateParams),
      )

      delete state.a.bar
      expect(cb).toBeCalledTimes(3)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a, 'bar'), undefined] satisfies UpdateParams),
      )

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

      const cb = vi.fn()
      setOnStoreNodeUpdate(cb)

      const unsubRoot = observeStoreNode(getOwnerStore())
      const unsubBranch = observeStoreNode(unwrap(state.a.bar))

      state.a.bar.push(4)
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a.bar, '3'), { value: 4 }] satisfies UpdateParams),
      )

      const arr = state.a.bar
      delete state.a.bar
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(
        ...([getNodeProp(state.a, 'bar'), undefined] satisfies UpdateParams),
      )

      arr.push(5)
      expect(cb).toBeCalledTimes(3)
      expect(cb).toBeCalledWith(...([getNodeProp(arr, '4'), { value: 5 }] satisfies UpdateParams))

      unsubBranch()
      arr.push(6)
      unsubRoot()
      state.baz = 'hello'
      expect(cb).toBeCalledTimes(3)

      dispose()
    })
  })

  it('handles circular references', () => {
    createRoot(dispose => {
      const state = createMutable<any>({ a: { foo: 123, bar: [1, 2, 3] } })

      const cb = vi.fn()
      setOnStoreNodeUpdate(cb)

      const unsub = observeStoreNode(getOwnerStore())

      const arr = state.a.bar
      state.a.bar = state
      arr.push(4)
      expect(cb).toHaveBeenNthCalledWith(
        1,
        ...([getNodeProp(state.a, 'bar'), { value: state }] satisfies UpdateParams),
      )

      state.a.bar.foo = 456
      expect(cb).toHaveBeenNthCalledWith(
        2,
        ...([getNodeProp(state, 'foo'), { value: 456 }] satisfies UpdateParams),
      )

      state.a.c = { nested: state.a }
      expect(cb).toHaveBeenNthCalledWith(
        3,
        ...([getNodeProp(state.a, 'c'), { value: state.a.c }] satisfies UpdateParams),
      )

      delete state.a.bar
      expect(cb).toHaveBeenNthCalledWith(
        4,
        ...([getNodeProp(state.a, 'bar'), undefined] satisfies UpdateParams),
      )

      arr.push(5)
      expect(cb).toBeCalledTimes(4)

      unsub()
      state.a.c.nested.foo = 789
      expect(cb).toBeCalledTimes(4)

      dispose()
    })
  })
})
