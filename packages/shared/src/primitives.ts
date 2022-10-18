import type { MemoOptions } from 'solid-js/types/reactive/signal'
import { Accessor, createMemo, createSignal, getOwner, onCleanup, untrack } from 'solid-js'
import { remove } from '@solid-primitives/immutable'
import { AnyFunction, onRootCleanup } from '@solid-primitives/utils'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createSharedRoot } from '@solid-primitives/rootless'
import { createMediaQuery } from '@solid-primitives/media'

export const untrackedCallback = <Fn extends AnyFunction>(fn: Fn): Fn =>
  ((...a: Parameters<Fn>) => untrack<ReturnType<Fn>>(fn.bind(void 0, ...a))) as any

export const useIsTouch = createSharedRoot(() => createMediaQuery('(hover: none)'))
export const useIsMobile = createSharedRoot(() => createMediaQuery('(max-width: 640px)'))

export function createHover(handle: (hovering: boolean) => void): {
  onMouseEnter: VoidFunction
  onMouseLeave: VoidFunction
} {
  let state = false
  let mounted = true
  const mql = window.matchMedia('(hover: none)')
  let isTouch = mql.matches
  makeEventListener(mql, 'change', ({ matches }) => {
    if ((isTouch = matches)) handle((state = false))
  })
  onCleanup(() => {
    mounted = false
    if (state) handle((state = false))
  })
  const onChange = (newState: boolean) => {
    if (isTouch || !mounted) return
    state !== newState && handle((state = newState))
  }
  return {
    onMouseEnter: () => onChange(true),
    onMouseLeave: () => setTimeout(() => onChange(false)),
  }
}

/**
 * Reactive array reducer — if at least one consumer (boolean signal) is enabled — the returned result will the `true`.
 *
 * For **IOC**
 */
export function createConsumers(): [
  needed: Accessor<boolean>,
  addConsumer: (consumer: Accessor<boolean>) => void,
] {
  const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([], { name: 'consumers' })
  const enabled = createMemo<boolean>(() => consumers().some(consumer => consumer()))
  return [
    enabled,
    consumer => {
      setConsumers(p => [...p, consumer])
      onRootCleanup(() => setConsumers(p => remove(p, consumer)))
    },
  ]
}

// TODO: contribute to @solid-primitives/memo

export type DerivedSignal<T> = [
  value: Accessor<T>,
  setSource: (source?: Accessor<T>) => Accessor<T> | undefined,
]

// types from https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts#L374
/**
 * For **IOC**
 */
export function createDerivedSignal<T>(): DerivedSignal<T>
export function createDerivedSignal<T>(fallback: T, options?: MemoOptions<T>): DerivedSignal<T>
export function createDerivedSignal<T>(fallback?: T, options?: MemoOptions<T>): DerivedSignal<T> {
  const [source, setSource] = createSignal<Accessor<T>>()
  return [
    createMemo(
      () => {
        const sourceRef = source()
        return sourceRef ? sourceRef() : (fallback as T)
      },
      undefined,
      options,
    ),
    newSource => {
      if (newSource && getOwner())
        onCleanup(() => setSource(p => (p === newSource ? undefined : p)))
      return setSource(() => newSource)
    },
  ]
}
