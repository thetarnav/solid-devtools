import {
  createSignal,
  type Accessor,
  type Setter,
  type Signal,
  type SignalOptions
} from 'solid-js'

export interface TrackedSignalOptions<T> extends SignalOptions<T> {
  /**
   * Human-readable identifier for telemetry and warnings.
   */
  name?: string
  /**
   * Maximum allowed state transitions within a single tick window before triggering storm warnings.
   * @default 50
   */
  maxTransitionsPerTick?: number
  /**
   * Custom hook called when a reactive storm or recursion threshold is exceeded.
   */
  onStorm?: (details: StormDetails<T>) => void
  /**
   * If true, throws an Error instead of console.warn when threshold is exceeded.
   * @default false
   */
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

/**
 * Signal wrapper with development-mode reactive cycle and storm detection.
 * Monitors update frequency per microtask tick to detect infinite dependency cascades.
 * Compiles down to standard `createSignal` with zero overhead in production builds.
 */
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
