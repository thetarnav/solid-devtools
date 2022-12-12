import { describe, it, expect } from 'vitest'
import { createComputed, createRoot, createSignal } from 'solid-js'
import {
  interceptComputationRerun,
  makeSolidUpdateListener,
  observeValueUpdate,
  removeValueUpdateObserver,
} from '../update'
import { getOwner } from '../utils'

describe('makeSolidUpdateListener', () => {
  it('listens to solid updates', () =>
    createRoot(dispose => {
      const [count, setCount] = createSignal(0)
      createComputed(count)
      let runs = 0
      makeSolidUpdateListener(() => runs++)

      queueMicrotask(() => {
        expect(runs).toBe(1)

        setCount(1)
        queueMicrotask(() => {
          expect(runs).toBe(2)

          dispose()
          setCount(2)
          queueMicrotask(() => {
            expect(runs).toBe(2)
          })
        })
      })
    }))
})

describe('interceptComputationRerun', () => {
  it('patches computation', () =>
    createRoot(dispose => {
      let last_prev: unknown
      let last_patched_prev: unknown
      let last_value: unknown
      let last_patched_value: unknown

      const [count, setCount] = createSignal(0)
      createComputed(prev => {
        last_prev = prev
        last_value = count()
        return last_value
      }, 'init')

      const owner = getOwner()!.owned![0]
      interceptComputationRerun(owner, (fn, prev) => {
        last_patched_prev = prev
        last_patched_value = fn()
      })

      expect(last_patched_prev).toBe(undefined)
      expect(last_patched_value).toBe(undefined)

      setCount(1)

      expect(last_prev).toBe(0)
      expect(last_value).toBe(1)
      expect(last_patched_prev).toBe(0)
      expect(last_patched_value).toBe(1)

      dispose()
    }))
})

describe('observeValueUpdate', () => {
  it('patches signal', () =>
    createRoot(dispose => {
      const [, setCount] = createSignal(0, { name: 's1' })
      const signal = getOwner()!.sourceMap!['s1']
      const symbol = Symbol()
      let last_prev: unknown
      let last_value: unknown
      observeValueUpdate(
        signal,
        (value, prev) => {
          last_prev = prev
          last_value = value
        },
        symbol,
      )

      expect(last_prev).toBe(undefined)
      expect(last_value).toBe(undefined)

      setCount(1)
      expect(last_prev).toBe(0)
      expect(last_value).toBe(1)

      removeValueUpdateObserver(signal, symbol)

      setCount(2)
      expect(last_prev).toBe(0)
      expect(last_value).toBe(1)

      dispose()
    }))
})
