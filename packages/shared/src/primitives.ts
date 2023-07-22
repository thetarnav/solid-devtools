import { makeEventListener } from '@solid-primitives/event-listener'
import { createMediaQuery } from '@solid-primitives/media'
import { createSingletonRoot } from '@solid-primitives/rootless'
import { tryOnCleanup, type AnyFunction, type PrimitiveValue } from '@solid-primitives/utils'
import {
    batch,
    createMemo,
    createSignal,
    equalFn,
    getOwner,
    onCleanup,
    untrack,
    type Accessor,
    type MemoOptions,
    type Setter,
    type SignalOptions,
} from 'solid-js'

export type WritableDeep<T> = 0 extends 1 & T
    ? T
    : T extends PrimitiveValue
    ? T
    : unknown extends T
    ? T
    : { -readonly [K in keyof T]: WritableDeep<T[K]> }

export const untrackedCallback = <Fn extends AnyFunction>(fn: Fn): Fn =>
    ((...a: Parameters<Fn>) => untrack<ReturnType<Fn>>(fn.bind(void 0, ...a))) as any

export const useIsTouch = createSingletonRoot(() => createMediaQuery('(hover: none)'))
export const useIsMobile = createSingletonRoot(() => createMediaQuery('(max-width: 640px)'))

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

export type Atom<T> = Accessor<T> & {
    get value(): T
    peak(): T
    set(value: T): T
    update: Setter<T>
    trigger(): void
}

export function atom<T>(initialValue: T, options?: SignalOptions<T>): Atom<T>
export function atom(initialValue?: undefined, options?: SignalOptions<undefined>): Atom<undefined>
export function atom<T>(initialValue: T, options?: SignalOptions<T>): Atom<T> {
    let mutating = false

    const equals = (options?.equals ?? equalFn) || (() => false)
    const [atom, setter] = createSignal(initialValue, {
        ...options,
        equals: (a, b) => (mutating ? (mutating = false) : equals(a, b)),
    }) as [Atom<T>, Setter<T>]

    atom.update = setter
    atom.trigger = () => {
        mutating = true
        setter(p => p)
    }
    atom.set = value => setter(() => value)
    atom.peak = () => untrack(atom)

    Object.defineProperty(atom, 'value', { get: atom })

    return atom
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
