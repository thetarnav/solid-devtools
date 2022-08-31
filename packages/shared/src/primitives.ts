import type { EqualityCheckerFunction, MemoOptions } from "solid-js/types/reactive/signal"
import {
  Accessor,
  createMemo,
  createSignal,
  getOwner,
  onCleanup,
  createSelector,
  untrack,
} from "solid-js"
import { remove } from "@solid-primitives/immutable"
import { AnyFunction, onRootCleanup } from "@solid-primitives/utils"

export const untrackedCallback = <Fn extends AnyFunction>(fn: Fn): Fn =>
  ((...a: Parameters<Fn>) => untrack<ReturnType<Fn>>(fn.bind(void 0, ...a))) as any

/**
 * Reactive array reducer — if at least one consumer (boolean signal) is enabled — the returned result will the `true`.
 *
 * For **IOC**
 */
export function createConsumers(): [
  needed: Accessor<boolean>,
  addConsumer: (consumer: Accessor<boolean>) => void,
] {
  const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([], { name: "consumers" })
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

export function createBoundSelector<T, U>(
  source: Accessor<T>,
  fn?: EqualityCheckerFunction<T, U>,
): [useSelector: (item: U) => Accessor<boolean>, selector: (item: U) => boolean] {
  const selector = createSelector(source, fn)
  return [item => selector.bind(void 0, item), selector]
}
