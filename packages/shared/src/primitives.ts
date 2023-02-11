import { makeEventListener } from '@solid-primitives/event-listener'
import { createMediaQuery } from '@solid-primitives/media'
import { createSharedRoot } from '@solid-primitives/rootless'
import {
  accessWith,
  AnyFunction,
  AnyStatic,
  entries,
  SetterParam,
  StaticStoreSetter,
  tryOnCleanup,
} from '@solid-primitives/utils'
import {
  $TRACK,
  Accessor,
  AccessorArray,
  batch,
  createMemo,
  createSignal,
  EffectFunction,
  getListener,
  getOwner,
  MemoOptions,
  NoInfer,
  onCleanup,
  Signal,
  SignalOptions,
  untrack,
} from 'solid-js'
import { Primitive } from 'type-fest'

export type WritableDeep<T> = 0 extends 1 & T
  ? T
  : T extends Primitive
  ? T
  : unknown extends T
  ? T
  : { -readonly [K in keyof T]: WritableDeep<T[K]> }

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
export function createConsumers(
  initial: readonly Accessor<boolean>[] = [],
): [needed: Accessor<boolean>, addConsumer: (consumer: Accessor<boolean>) => void] {
  const [consumers, setConsumers] = createSignal([...initial], { name: 'consumers' })
  const enabled = createMemo(() => consumers().some(consumer => consumer()))
  return [
    enabled,
    consumer => {
      setConsumers(p => [...p, consumer])
      tryOnCleanup(() => setConsumers(p => p.filter(c => c !== consumer)))
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

// TODO: contribute to solid-primitives

// TODO: better support touch

export function makeHoverElementListener(onHover: (el: HTMLElement | null) => void): void {
  let last: HTMLElement | null = null
  const handleHover = (e: { target: unknown }) => {
    const { target } = e
    if (target === last || (!(target instanceof HTMLElement) && target !== null)) return
    onHover((last = target))
  }
  makeEventListener(window, 'mouseover', handleHover)
  makeEventListener(document, 'mouseleave', handleHover.bind(void 0, { target: null }))
}

/**
 * Solid's `on` helper, but always defers and returns a provided initial value when if does instead of `undefined`.
 *
 * @param deps
 * @param fn
 * @param initialValue
 */
export function defer<S, Next extends Prev, Prev = Next>(
  deps: AccessorArray<S> | Accessor<S>,
  fn: (input: S, prevInput: S, prev: undefined | NoInfer<Prev>) => Next,
  initialValue: Next,
): EffectFunction<undefined | NoInfer<Next>, NoInfer<Next>>
export function defer<S, Next extends Prev, Prev = Next>(
  deps: AccessorArray<S> | Accessor<S>,
  fn: (input: S, prevInput: S, prev: undefined | NoInfer<Prev>) => Next,
  initialValue?: undefined,
): EffectFunction<undefined | NoInfer<Next>>
export function defer<S, Next extends Prev, Prev = Next>(
  deps: AccessorArray<S> | Accessor<S>,
  fn: (input: S, prevInput: S, prev: undefined | NoInfer<Prev>) => Next,
  initialValue?: Next,
): EffectFunction<undefined | NoInfer<Next>> {
  const isArray = Array.isArray(deps)
  let prevInput: S
  let shouldDefer = true
  return prevValue => {
    let input: S
    if (isArray) {
      input = Array(deps.length) as S
      for (let i = 0; i < deps.length; i++) (input as any[])[i] = deps[i]()
    } else input = deps()
    if (shouldDefer) {
      shouldDefer = false
      prevInput = input
      return initialValue
    }
    const result = untrack(() => fn(input, prevInput, prevValue))
    prevInput = input
    return result
  }
}

export type Atom<T> = (<U extends T>(value: (prev: T) => U) => U) &
  (<U extends T>(value: Exclude<U, Function>) => U) &
  (<U extends T>(value: Exclude<U, Function> | ((prev: T) => U)) => U) &
  Accessor<T>

export function atom<T>(value: T, options?: SignalOptions<T>): Atom<T>
export function atom<T>(
  value?: undefined,
  options?: SignalOptions<T | undefined>,
): Atom<T | undefined>
export function atom<T>(value?: T, options?: SignalOptions<T | undefined>): Atom<T | undefined> {
  const [state, setState] = createSignal(value, { internal: true, ...options })
  return (...args: any[]) => (args.length === 1 ? setState(args[0]) : state())
}

/**
 * Creates a signal that will be activated for a given amount of time on every "ping" — a call to the listener function.
 */
export function createPingedSignal(
  timeout = 400,
): [isUpdated: Accessor<boolean>, ping: VoidFunction] {
  const [isUpdated, setIsUpdated] = createSignal(false)

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const ping = () => {
    setIsUpdated(true)
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => setIsUpdated(false), timeout)
  }
  onCleanup(() => clearTimeout(timeoutId))

  return [isUpdated, ping]
}

// TODO: move createUnownedRoot to solid-primitives
// export function createUnownedRoot<T>(fn: (dispose: VoidFunction) => T): T {
//   return runWithOwner(null as any, () => createRoot(fn))
// }

// ! unfinished
export function createShallowStore<T extends Readonly<AnyStatic>>(
  storeValue: T,
): [T, StaticStoreSetter<T>] {
  const signals: Record<PropertyKey, Signal<any>> = {}

  const [keys, setKeys] = createSignal(Object.keys(storeValue), { internal: true })
  let hasKeysChanged = false

  // TODO handle arrays

  const setValue = (key: keyof T, setterParam: SetterParam<any>): void => {
    const saved = signals[key] as Signal<any> | undefined
    const newValue = saved ? saved[1](setterParam) : accessWith(setterParam, storeValue[key])
    if (newValue === void 0) {
      delete storeValue[key]
      hasKeysChanged = true
    } else {
      storeValue[key] = newValue
    }
  }

  const setter = (a: ((prev: T) => Partial<T>) | Partial<T> | keyof T, b?: SetterParam<any>) => {
    batch(() => {
      if (typeof a === 'object' || typeof a === 'function')
        untrack(() => {
          for (const [key, newValue] of entries(accessWith(a, store) as Partial<T>))
            setValue(key, () => newValue)
        })
      else setValue(a, b)
      if (hasKeysChanged) {
        hasKeysChanged = false
        setKeys(Object.keys(storeValue))
      }
    })
    return store
  }

  const store = new Proxy(storeValue, {
    get(target, key) {
      if (key === $TRACK) {
        keys()
        return true
      }
      let signal = signals[key]
      if (!signal) {
        if (!getListener()) {
          return storeValue[key as keyof T]
        }
        signal = createSignal<any>(storeValue[key as keyof T], { internal: true })
        signals[key] = signal
      }
      return signal[0]()
    },

    has(target, key) {
      if (key === $TRACK) return true
      this.get!(target, key, target)
      return key in target
    },

    set() {
      // eslint-disable-next-line no-console
      console.warn('Cannot mutate a Store directly')
      return true
    },

    deleteProperty() {
      // eslint-disable-next-line no-console
      console.warn('Cannot mutate a Store directly')
      return true
    },

    ownKeys: () => keys().slice(),

    getOwnPropertyDescriptor() {
      // eslint-disable-next-line no-console
      console.warn('getOwnPropertyDescriptor is not yet implemented for shallow stores')
      return undefined
    },
  })

  return [store, setter]
}

export function handleTupleUpdate<
  T extends readonly [PropertyKey, any],
  O = { readonly [K in T as K[0]]: (value: K[1]) => void },
>(handlers: O): (update: T) => void {
  return update => (handlers as any)[update[0]](update[1])
}

export function handleTupleUpdates<
  T extends readonly [PropertyKey, any],
  O = { readonly [K in T as K[0]]: (value: K[1]) => void },
>(handlers: O): (updates: T[]) => void {
  function runUpdates(updates: T[]) {
    for (const [key, value] of updates) (handlers as any)[key](value)
  }
  return updates => batch(runUpdates.bind(void 0, updates))
}
