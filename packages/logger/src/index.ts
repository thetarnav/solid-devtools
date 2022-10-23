import { Accessor, onCleanup, $PROXY, untrack, createEffect, on } from 'solid-js'
import { arrayEquals, asArray, Many } from '@solid-primitives/utils'
import {
  getOwnerType,
  isSolidComputation,
  observeValueUpdate,
  onParentCleanup,
  getFunctionSources,
  makeSolidUpdateListener,
  isSolidMemo,
  interceptComputationRerun,
  lookupOwner,
  makeValueUpdateListener,
  removeValueUpdateObserver,
  Core,
  getOwner,
  Solid,
} from '@solid-devtools/debugger'
import { NodeType } from '@solid-devtools/shared/graph'
import { dedupeArray, arrayRefEquals } from '@solid-devtools/shared/utils'
import {
  getComputationCreatedLabel,
  getComputationRerunLabel,
  getOwnerDisposedLabel,
  getNodeState,
  logComputation,
  logInitialValue,
  logObservers,
  logOwned,
  logSignalsInitialValues,
  logSignalValueUpdate,
  UNUSED,
  NodeStateWithValue,
  paddedForEach,
  getPropsInitLabel,
  logSignalValue,
  getPropsKeyUpdateLabel,
  getPropLabel,
} from './log'
import { getDiffMap, makeTimeMeter } from './utils'

declare module 'solid-js/types/reactive/signal' {
  interface Owner {
    $debug?: boolean
    $debugSignals?: boolean
    $debugOwned?: boolean
  }
  interface SignalState<T> {
    $debugSignal?: boolean
  }
}

const isSolidProxy = (o: any): boolean => !!o[$PROXY]

/**
 * @returns true if the node was marked before
 */
function markDebugNode(
  o: Core.Owner,
  type: 'computation' | 'signals' | 'owned',
): true | VoidFunction
function markDebugNode(o: Core.SignalState): true | VoidFunction
function markDebugNode(
  o: Core.Owner | Core.SignalState,
  type?: 'computation' | 'signals' | 'owned',
): true | VoidFunction {
  let property: '$debug' | '$debugSignals' | '$debugOwned' | '$debugSignal'
  if (type === 'computation') property = '$debug'
  else if (type === 'signals') property = '$debugSignals'
  else if (type === 'owned') property = '$debugOwned'
  else property = '$debugSignal'

  if ((o as any)[property]) return true
  ;(o as any)[property] = true
  return () => ((o as any)[property] = false)
}

interface DebugComputationOptions {
  /** hook called during initial computation run? *(Defaults to `true`)* */
  initialRun?: boolean
}

/**
 * Debug the current computation owner by logging it's lifecycle state to the browser console.
 * @param owner The owner to debug. If not provided, the current owner will be used.
 * @param options Options for the debug. _(optional)_
 *
 * Following information will be tracked and displayed in the console:
 * - The computation's initial state. (value, name, dependencies, execution time, etc.)
 * - The computation's state after each rerun. (value, previous value, dependencies, sources that have caused the rerun, execution time, etc.)
 * - The computation disposal.
 *
 * @example
 * ```ts
 * createEffect(() => {
 * 	debugComputation()
 * 	// ...
 * })
 * ```
 */
export function debugComputation(owner?: Core.Owner, options?: DebugComputationOptions): void
export function debugComputation(
  _owner?: Core.Owner,
  { initialRun = true }: DebugComputationOptions = {},
): void {
  const owner = _owner === undefined ? getOwner() : (_owner as Solid.Owner)
  if (!owner || !isSolidComputation(owner)) return console.warn('owner is not a computation')

  if (markDebugNode(owner, 'computation') === true) return

  const { type, typeName, name } = getNodeState(owner)
  const SYMBOL = Symbol(name)
  // log prev value only of the computation callback uses it
  const usesPrev = !!owner.fn.length
  const usesValue = usesPrev || type === NodeType.Memo

  let updateListeners: VoidFunction[] = []
  let signalUpdates: NodeStateWithValue[] = []

  // patches source objects to track their value updates
  // will unsubscribe from previous sources on each call
  const observeSources = (sources: (Solid.Computation | Solid.Signal)[]) => {
    updateListeners.forEach(unsub => unsub())
    updateListeners = []
    sources.forEach(source => {
      observeValueUpdate(
        source,
        value => signalUpdates.push({ ...getNodeState(source), value }),
        SYMBOL,
      )
      updateListeners.push(() => removeValueUpdateObserver(source, SYMBOL))
    })
  }

  // this is for logging the initial state after the first callback execution
  // the "value" property is monkey patched for one function execution
  if (initialRun) {
    observeValueUpdate(
      owner,
      value => {
        const timeElapsed = time()
        removeValueUpdateObserver(owner, SYMBOL)
        const sources = owner.sources ? dedupeArray(owner.sources) : []

        logComputation(getComputationCreatedLabel(typeName, name, timeElapsed), {
          owner: { type, typeName, name },
          owned: owner.owned ?? [],
          sources,
          prev: UNUSED,
          value: usesValue ? value : UNUSED,
          causedBy: null,
        })
        observeSources(sources)
      },
      SYMBOL,
    )
  }
  // if debugComputation after the initial run of the computation
  // sources should be observed immediately
  else observeSources(owner.sources ? dedupeArray(owner.sources) : [])

  // monkey patch the "fn" callback to intercept every computation function execution
  interceptComputationRerun(owner, (fn, prev) => {
    const updates = signalUpdates
    signalUpdates = []

    time()
    const value = fn()
    const elapsedTime = time()

    const sources = owner.sources ? dedupeArray(owner.sources) : []
    logComputation(getComputationRerunLabel(name, elapsedTime), {
      owner: UNUSED,
      owned: owner.owned ?? [],
      sources,
      prev: usesPrev ? prev : UNUSED,
      value: usesValue ? value : UNUSED,
      causedBy: updates,
    })
    observeSources(sources)
  })

  // CLEANUP
  // listen to parent cleanup, instead of own, because for computations onCleanup runs for every re-execution
  onParentCleanup(
    owner,
    () => {
      console.log(...getOwnerDisposedLabel(name))
      updateListeners.forEach(unsub => unsub())
      updateListeners.length = 0
      signalUpdates.length = 0
    },
    // run before other cleanup functions
    true,
  )

  const time = makeTimeMeter()
}

/**
 * Debug the computations owned by the provided {@link owner} by logging their lifecycle state to the browser console.
 * @param owner The owner to debug. If not provided, the current owner will be used.
 * @param options Options for the debug. _(optional)_
 *
 * Following information will be tracked and displayed in the console:
 * - The computations initial state. (value, name, dependencies, execution time, etc.)
 * - The computations state after each rerun. (value, previous value, dependencies, sources that have caused the rerun, execution time, etc.)
 * - The computations disposal.
 *
 * @example
 * ```tsx
 * const Button = props => {
 * 	debugOwnerComputations()
 * 	createEffect(() => {...})
 * 	return <button {...props} />
 * }
 * ```
 */
export function debugOwnerComputations(owner?: Core.Owner): void
export function debugOwnerComputations(_owner?: Core.Owner): void {
  const owner = _owner === undefined ? getOwner() : (_owner as Solid.Owner)
  if (!owner) return console.warn('no owner passed to debugOwnedComputations')

  const marked = markDebugNode(owner, 'owned')
  if (marked === true) return
  onCleanup(marked)

  // for solid-refresh HMR memos, return the owned component
  const { type, typeName, name } = getNodeState(
    lookupOwner(owner, o => getOwnerType(o) !== NodeType.Refresh)!,
  )

  let prevOwned: Solid.Computation[] = []

  makeSolidUpdateListener(() => {
    const { owned } = owner
    if (!owned) return

    let computations: Solid.Computation[] = []

    let i = prevOwned.length
    // owned can only be added
    for (; i < owned.length; i++) {
      const computation = owned[i]
      debugComputation(computation, {
        initialRun: false,
      })
      computations.push(computation)
    }
    if (computations.length === 0) return

    computations = [...prevOwned, ...computations]
    // log owned computation changes
    logOwned({ type, typeName, name }, computations, prevOwned)
    prevOwned = computations
  })
}

export interface DebugSignalOptions {
  trackObservers?: boolean
  logInitialValue?: boolean
}

/**
 * Debug the provided {@link source} by logging its lifecycle state to the browser console.
 * @param source The signal to debug. *(a function that will be executed to get the signal node)*
 * @param options Options for the debug. _(optional)_
 *
 * Following information will be tracked and displayed in the console:
 * - The signal's initial state. (value, name, observers, etc.)
 * - The signal's state after each value update. (value, previous value, observers, caused reruns, etc.)
 *
 * @example
 * ```ts
 * const [count, setCount] = createSignal(0)
 * debugSignal(count)
 * ```
 */
export function debugSignal(
  source: Accessor<unknown> | Core.SignalState,
  options: DebugSignalOptions = {},
): void {
  let signal: Solid.Signal

  if (typeof source === 'function') {
    const sources = getFunctionSources(source)
    if (sources.length === 0) return console.warn('No signal was passed to debugSignal')
    else if (sources.length > 1)
      return console.warn('More then one signal was passed to debugSignal')
    signal = sources[0]
  } else {
    signal = source as Solid.Signal
  }

  if (markDebugNode(signal) === true) return

  const { trackObservers = true, logInitialValue: _logInitialValue = true } = options

  const state = getNodeState(signal)
  const SYMBOL = Symbol(state.name)

  // Initial
  _logInitialValue && logInitialValue({ ...state, value: signal.value })

  let actualObservers: Solid.Computation[]
  let prevObservers: Solid.Computation[] = []
  let actualPrevObservers: Solid.Computation[] = []

  if (!signal.observers) {
    signal.observers = []
    signal.observerSlots = []
  }

  // Value Update
  makeValueUpdateListener(
    signal,
    (value, prev) => {
      logSignalValueUpdate(
        state,
        value,
        prev,
        trackObservers ? prevObservers : dedupeArray(signal.observers!),
      )
    },
    SYMBOL,
  )

  if (trackObservers) {
    // Observers Change
    function logObserversChange() {
      const observers = dedupeArray(actualObservers)
      if (arrayRefEquals(observers, prevObservers)) return
      logObservers(state.name, observers, prevObservers)
      prevObservers = [...observers]
      actualPrevObservers = [...actualObservers]
    }

    // Listen to Solid's _$afterUpdate hook to check if observers changed
    makeSolidUpdateListener(() => {
      actualObservers = signal.observers!
      if (actualObservers.length !== actualPrevObservers.length) return logObserversChange()
      for (let i = actualObservers.length; i >= 0; i--) {
        if (actualObservers[i] !== actualPrevObservers[i]) return logObserversChange()
      }
    })
  }
}

/**
 * Debug the provided {@link source} signals by logging their lifecycle state to the browser console.
 * @param source The signals to debug. *(a function that will be executed to get the graph nodes — or an array thereof)*
 * @param options Options for the debug. _(optional)_
 *
 * Following information will be tracked and displayed in the console:
 * - The signals initial state. (value, name, observers, etc.)
 * - The signals state after each value update. (value, previous value, observers, caused reruns, etc.)
 *
 * @example
 * ```ts
 * const [count, setCount] = createSignal(0)
 * const double = createMemo(() => count * 2)
 * debugSignals([count, double])
 * ```
 */
export function debugSignals(
  source: Many<Accessor<unknown>> | Core.SignalState[],
  options: DebugSignalOptions = {},
): void {
  let signals: Solid.Signal[] = []
  asArray(source).forEach(s => {
    if (typeof s === 'function') signals.push.apply(signals, getFunctionSources(s))
    else signals.push(s as Solid.Signal)
  })
  if (signals.length === 0) return console.warn('No signals were passed to debugSignals')

  // filter out already debugged signals
  signals = signals.filter(s => !s.$debugSignal)

  if (signals.length === 1) return debugSignal(signals[0], options)

  const { logInitialValue = true } = options

  if (logInitialValue) logSignalsInitialValues(signals)

  signals.forEach(signal => {
    debugSignal(signal, {
      ...options,
      logInitialValue: false,
    })
  })
}

/**
 * Debug the {@link owner} signals by logging their lifecycle state to the browser console.
 * @param owner owner to get the signals from.
 * @param options Options for the debug. _(optional)_
 *
 * Following information will be tracked and displayed in the console:
 * - The signals initial state. (value, name, observers, etc.)
 * - The signals state after each value update. (value, previous value, observers, caused reruns, etc.)
 *
 * @example
 * ```tsx
 * const Button = props => {
 * 	const [count, setCount] = createSignal(0)
 * 	const double = createMemo(() => count * 2)
 * 	debugOwnerSignals()
 * 	return <button onClick={() => setCount(count + 1)}>{count}</button>
 * }
 * ```
 */
export function debugOwnerSignals(owner?: Core.Owner, options: DebugSignalOptions = {}) {
  owner = getOwner()!
  if (!owner) return console.warn('debugOwnerState found no Owner')

  if (markDebugNode(owner, 'signals') === true) return

  const solidOwner = owner as Solid.Owner

  let prevSourceListLength = 0
  let prevOwnedLength = 0

  makeSolidUpdateListener(() => {
    const signals: Solid.Signal[] = []

    let i: number
    // add owned signals
    if (solidOwner.sourceMap) {
      const sourceList = Object.values(solidOwner.sourceMap)
      // signals can only be added
      for (i = prevSourceListLength; i < sourceList.length; i++) signals.push(sourceList[i])
      prevSourceListLength = i
    }
    // add owned memos
    if (solidOwner.owned) {
      // owned can only be added
      for (i = prevOwnedLength; i < solidOwner.owned.length; i++) {
        const owner = solidOwner.owned[i]
        if (isSolidMemo(owner)) signals.push(owner)
      }
      prevOwnedLength = i
    }

    if (signals.length === 0) return

    debugSignals(signals, options)
  })
}

const getPropValue = (props: Record<string, unknown>, desc: PropertyDescriptor): unknown =>
  untrack(() => (desc.get ? desc.get.call(props) : desc.value))

/**
 * Debug the provided {@link props} object by logging their state to the console.
 * @param props component's props object.
 * @example
 * ```tsx
 * const Button = props => {
 * 	debugProps(props)
 * 	return <div>Hello</div>
 * }
 * ```
 */
export function debugProps(props: Record<string, unknown>): void {
  const owner = getOwner()
  if (!owner) return console.warn('debugProps should be used synchronously inside a component')

  // for solid-refresh HMR memos, return the owned component
  const ownerState = getNodeState(lookupOwner(owner, o => getOwnerType(o) !== NodeType.Refresh)!)
  const isProxy = isSolidProxy(props)

  const descriptorsList = Object.entries(Object.getOwnPropertyDescriptors(props))

  if (descriptorsList.length === 0) console.log(...getPropsInitLabel(ownerState, isProxy, true))
  else {
    console.groupCollapsed(...getPropsInitLabel(ownerState, isProxy, false))
    paddedForEach(
      descriptorsList,
      ([, desc]) => (desc.get ? 'Getter' : 'Value'),
      (type, [key, desc]) => {
        const value = getPropValue(props, desc)
        const signals = type === 'Getter' ? getFunctionSources(() => props[key]) : []
        const label = getPropLabel(type, key, value, null)

        if (signals.length > 0) {
          console.groupCollapsed(...label)
          signals.forEach(logSignalValue)
          console.groupEnd()
        } else console.log(...label)
      },
    )
    console.groupEnd()
  }

  if (isProxy) {
    createEffect(
      on(
        () => Object.keys(props),
        (keys, prevKeys) => {
          if (!prevKeys) return
          if (arrayEquals(keys, prevKeys)) return

          const descriptors = Object.getOwnPropertyDescriptors(props)

          if (Object.entries(descriptors).length === 0) {
            console.log(...getPropsKeyUpdateLabel(ownerState, true))
          } else {
            const [getMark, allKeys] = getDiffMap(prevKeys, keys, Map)
            console.groupCollapsed(...getPropsKeyUpdateLabel(ownerState, false))
            allKeys.forEach(key => {
              const mark = getMark(key)

              if (mark === 'removed')
                return console.log(...getPropLabel('Getter', key, null, 'removed'))

              const desc = descriptors[key]
              const value = getPropValue(props, desc)
              const label = getPropLabel('Getter', key, value, mark)
              const signals = getFunctionSources(() => props[key])

              if (signals.length > 0) {
                console.groupCollapsed(...label)
                signals.forEach(logSignalValue)
                console.groupEnd()
              } else console.log(...label)
            })
            console.groupEnd()
          }
        },
      ),
      undefined,
      { name: 'debugProps EFFECT' },
    )
  }
}

// export function debugStore(store: object): void {
// 	if (!isSolidProxy(store)) {
// 		console.warn("debugStore should be used with a proxy. Instead used on:", store)
// 		return
// 	}
// 	const owner = getOwner()
// 	if (!owner) {
// 		console.warn("debugStore should be used synchronously inside an owner")
// 		return
// 	}
// 	const argTarget = (store as any)[$RAW]
// 	// console.log(argTarget)

// 	if (owner.sourceMap) {
// 		// Object.defineProperty(argTarget, $RAW, {
// 		// 	get() {
// 		// 		console.log("ASDFGSDGDRHDZ")
// 		// 		return argTarget
// 		// 	},
// 		// })
// 		// const ownerTarget = Object.values(owner.sourceMap).find(
// 		// 	s => !("name" in s) && s.value === argTarget,
// 		// )
// 		// if (ownerTarget) {
// 		// 	ownerTarget.value = {
// 		// 		0: {
// 		// 			title: "Ahahaha",
// 		// 			done: true,
// 		// 		},
// 		// 	}
// 		// 	console.log(ownerTarget)
// 		// }
// 	}
// }
