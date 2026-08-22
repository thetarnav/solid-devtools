import {
  createSignal,
  type Accessor,
  type Setter,
  type Signal,
  type SignalOptions
} from 'solid-js'

export interface TrackedSignalOptions<T> extends SignalOptions<T> {
  name?: string
  maxTransitionsPerTick?: number
  onStorm?: (details: StormDetails<T>) => void
  throwOnStorm?: boolean
}

export interface StormDetails<T> {
  signalName: string
  transitionsInTick: number
  lastValue: T
  nextValue: T
  stack?: string
}

const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

export function createTrackedSignal<T>(
  initialValue: T,
  options: TrackedSignalOptions<T> = {}
): Signal<T> {
  const [read, rawSet] = createSignal<T>(initialValue, options)

  if (isProduction) {
    return [read, rawSet]
  }

  const signalName = options.name ?? `signal_${Math.random().toString(36).slice(2, 8)}`
  const maxTransitions = options.maxTransitionsPerTick ?? 50

  let transitionCount = 0
  let resetScheduled = false

  const scheduleReset = (): void => {
    if (resetScheduled) return
    resetScheduled = true

    queueMicrotask(() => {
      transitionCount = 0
      resetScheduled = false
    })
  }

  const trackedSet: Setter<T> = ((valueOrUpdater: unknown) => {
    transitionCount += 1
    scheduleReset()

    const previousValue = read()
    let nextValue: T

    if (typeof valueOrUpdater === 'function') {
      nextValue = (valueOrUpdater as (prev: T) => T)(previousValue)
    } else {
      nextValue = valueOrUpdater as T
    }

    if (transitionCount > maxTransitions) {
      const details: StormDetails<T> = {
        signalName,
        transitionsInTick: transitionCount,
        lastValue: previousValue,
        nextValue,
        stack: new Error().stack
      }

      if (options.onStorm) {
        options.onStorm(details)
      } else {
        const message = `[Solid DevTools] Reactive storm detected on '${signalName}'. Exceeded ${maxTransitions} transitions in a single microtask tick.`
        if (options.throwOnStorm) {
          throw new Error(message)
        } else {
          console.warn(message, details)
        }
      }
    }

    return rawSet(nextValue as Parameters<typeof rawSet>[0])
  }) as Setter<T>

  return [read, trackedSet]
}
