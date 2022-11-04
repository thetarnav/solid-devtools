import { describe, vi, it, expect } from 'vitest'
import { createRoot } from 'solid-js'
import {
  createMutable,
  createStore,
  produce,
  reconcile,
  unwrap,
  modifyMutable,
} from 'solid-js/store'
import { Solid } from '../../types'
import { getOwner, isSolidStore } from '../../utils'
import { observeStoreNode, StoreUpdateHandler } from '../store'

const getOwnerStore = () =>
  (Object.values(getOwner()!.sourceMap!).find(s => isSolidStore(s))! as Solid.Store).value

describe('observeStoreNode', () => {
  it('listens to simple store updates', () => {
    createRoot(dispose => {
      const [state, setState] = createStore<any>({ count: 0 })
      const store = getOwnerStore()
      const cb = vi.fn<Parameters<StoreUpdateHandler>, void>()
      const unsub = observeStoreNode(store, cb)
      expect(cb).not.toBeCalled()

      setState({ count: 1 })
      expect(cb).toBeCalledTimes(1)
      let args: Parameters<StoreUpdateHandler>[0] = {
        path: [],
        property: 'count',
        value: 1,
      }
      expect(cb).toBeCalledWith(args)

      setState('count', 2)
      expect(cb).toBeCalledTimes(2)
      args = {
        path: [],
        property: 'count',
        value: 2,
      }
      expect(cb).toBeCalledWith(args)

      setState(reconcile({}))
      expect(cb).toBeCalledTimes(3)
      args = {
        path: [],
        property: 'count',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      setState({ a: { foo: 123, bar: [1, 2, 3] }, b: 'hello' })
      expect(cb).toBeCalledTimes(5)
      args = {
        path: [],
        property: 'a',
        value: unwrap(state.a),
      }
      expect(cb).toHaveBeenNthCalledWith(4, args)
      args = {
        path: [],
        property: 'b',
        value: 'hello',
      }
      expect(cb).toHaveBeenNthCalledWith(5, args)

      setState(produce((proxy: any) => delete proxy.a.foo))
      expect(cb).toBeCalledTimes(6)
      args = {
        path: ['a'],
        property: 'foo',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      setState(produce((proxy: any) => proxy.a.bar.push(4)))
      expect(cb).toBeCalledTimes(7)
      args = {
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
      const unsub = observeStoreNode(store, cb)
      expect(cb).not.toBeCalled()

      state.count = 1
      expect(cb).toBeCalledTimes(1)
      let args: Parameters<StoreUpdateHandler>[0] = {
        path: [],
        property: 'count',
        value: 1,
      }
      expect(cb).toBeCalledWith(args)

      modifyMutable(state, reconcile({}))
      expect(cb).toBeCalledTimes(2)
      args = {
        path: [],
        property: 'count',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      state.a = { foo: 123, bar: [1, 2, 3] }
      expect(cb).toBeCalledTimes(3)
      args = {
        path: [],
        property: 'a',
        value: unwrap(state.a),
      }
      expect(cb).toBeCalledWith(args)

      delete state.a.foo
      expect(cb).toBeCalledTimes(4)
      args = {
        path: ['a'],
        property: 'foo',
        value: undefined,
      }
      expect(cb).toBeCalledWith(args)

      state.a.bar.push(4)
      expect(cb).toBeCalledTimes(5)
      args = {
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
      const unsub = observeStoreNode(store, cb)

      const detached = state.a.bar

      const a1 = (state.a = { other: 'hello' })
      let args: Parameters<StoreUpdateHandler>[0] = {
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
        path: ['a'],
        property: 'bar',
        value: detached,
      }
      expect(cb).toBeCalledTimes(2)
      expect(cb).toBeCalledWith(args)

      delete state.a.bar
      args = {
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
      const unsubRoot = observeStoreNode(getOwnerStore(), rootCb)

      const cb = vi.fn()
      const unsubBranch = observeStoreNode(unwrap(state.a.bar), cb)

      state.a.bar.push(4)
      let args: Parameters<StoreUpdateHandler>[0] = {
        path: ['a', 'bar'],
        property: '3',
        value: 4,
      }
      expect(rootCb).toBeCalledTimes(1)
      expect(rootCb).toBeCalledWith(args)
      args = {
        path: [],
        property: '3',
        value: 4,
      }
      expect(cb).toBeCalledTimes(1)
      expect(cb).toBeCalledWith(args)

      const arr = state.a.bar
      delete state.a.bar
      args = {
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
