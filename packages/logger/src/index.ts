import type { SignalState, Owner } from "solid-js/types/reactive/signal"
import { Accessor, onCleanup } from "solid-js"
import { asArray, Many } from "@solid-primitives/utils"
import {
	getOwnerType,
	getOwnerName,
	isSolidComputation,
	observeValueUpdate,
	onParentCleanup,
	getFunctionSources,
	makeSolidUpdateListener,
	getName,
	isSolidMemo,
	isSolidOwner,
} from "@solid-devtools/debugger"
import { getOwner, OwnerType, SolidComputation, SolidOwner, SolidSignal } from "@shared/graph"
import { dedupeArray, arrayRefEquals } from "@shared/utils"
import {
	getComputationCreatedLabel,
	getComputationRerunLabel,
	getOwnerDisposedLabel,
	logComputation,
	logInitialValue,
	logObservers,
	logSignalsInitialValues,
	logSignalValueUpdate,
	UNUSED,
	UpdateCause,
} from "./log"

declare module "solid-js/types/reactive/signal" {
	interface Owner {
		$debug?: boolean
		$debugSignals?: boolean
	}
	interface SignalState<T> {
		$debugSignal?: boolean
	}
}

function makeTimeMeter(): () => number {
	let last = performance.now()
	return () => {
		const now = performance.now()
		const diff = now - last
		last = now
		return Math.round(diff)
	}
}

/**
 * @returns true if the node was marked before
 */
function markDebugNode(o: Owner, type: "computation" | "signals"): true | void
function markDebugNode(o: SignalState<any>): true | void
function markDebugNode(o: Owner | SignalState<any>, type?: "computation" | "signals"): true | void {
	switch (type) {
		case "computation":
			if ((o as Owner).$debug) return true
			;(o as Owner).$debug = true
		case "signals":
			if ((o as Owner).$debugSignals) return true
			;(o as Owner).$debugSignals = true
		default:
			if ((o as SignalState<any>).$debugSignal) return true
			;(o as SignalState<any>).$debugSignal = true
	}
}

export function debugComputation() {
	const owner = getOwner()
	if (!owner || !isSolidComputation(owner)) return console.warn("owner is not a computation")

	if (markDebugNode(owner, "computation")) return

	const type = getOwnerType(owner)
	const typeName = OwnerType[type]
	const name = getOwnerName(owner)
	const SYMBOL = Symbol(name)
	// log prev value only of the computation callback uses it
	const usesPrev = !!owner.fn.length
	const usesValue = usesPrev || type === OwnerType.Memo

	let updateListeners: VoidFunction[] = []
	let signalUpdates: UpdateCause[] = []

	// patches source objects to track their value updates
	// will unsubscribe from previous sources on each call
	const observeSources = (sources: (SolidComputation | SolidSignal)[]) => {
		updateListeners.forEach(unsub => unsub())
		updateListeners = []
		sources.forEach(source => {
			const unsub = observeValueUpdate(
				source,
				value => {
					const update: UpdateCause = {
						type: isSolidOwner(source) ? "computation" : "signal",
						name: getName(source),
						value,
					}
					signalUpdates.push(update)
				},
				SYMBOL,
			)
			updateListeners.push(unsub)
		})
	}

	// this is for logging the initial state after the first callback execution
	// the "value" property is monkey patched for one function execution
	const removeValueObserver = observeValueUpdate(
		owner,
		value => {
			const timeElapsed = time()
			removeValueObserver()
			const sources = owner.sources ? dedupeArray(owner.sources) : []

			logComputation(getComputationCreatedLabel(typeName, name, timeElapsed), {
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

	// monkey patch the "fn" callback to intercept every computation function execution
	const fn = owner.fn
	owner.fn = prev => {
		const updates = signalUpdates
		signalUpdates = []

		time()
		const value = fn(prev)
		const elapsedTime = time()

		const sources = owner.sources ? dedupeArray(owner.sources) : []
		logComputation(getComputationRerunLabel(name, elapsedTime), {
			owned: owner.owned ?? [],
			sources,
			prev: usesPrev ? prev : UNUSED,
			value: usesValue ? value : UNUSED,
			causedBy: updates,
		})
		observeSources(sources)

		return value
	}

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

export interface DebugSignalOptions {
	trackObservers?: boolean
	logInitialValue?: boolean
}

export function debugSignal(
	source: Accessor<unknown> | SignalState<unknown>,
	options: DebugSignalOptions = {},
): void {
	let signal: SolidSignal

	if (typeof source === "function") {
		const sources = getFunctionSources(source)
		if (sources.length === 0) return console.warn("No signal was passed to debugSignal")
		else if (sources.length > 1)
			return console.warn("More then one signal was passed to debugSignal")
		signal = sources[0]
	} else {
		signal = source as SolidSignal
	}

	if (markDebugNode(signal)) return

	const { trackObservers = true, logInitialValue: _logInitialValue = true } = options

	const isSignal = !isSolidOwner(signal)
	const type = isSignal ? "Signal" : "Memo"
	const name = getName(signal)
	const SYMBOL = Symbol(name)

	// Initial
	_logInitialValue && logInitialValue(type, name, signal.value)

	let actualObservers: SolidComputation[]
	let prevObservers: SolidComputation[] = []
	let actualPrevObservers: SolidComputation[] = []

	if (!signal.observers) {
		signal.observers = []
		signal.observerSlots = []
	}

	// Value Update
	onCleanup(
		observeValueUpdate(
			signal,
			(value, prev) => {
				logSignalValueUpdate(
					name,
					value,
					prev,
					trackObservers ? prevObservers : dedupeArray(signal.observers!),
				)
			},
			SYMBOL,
		),
	)

	if (trackObservers) {
		// Observers Change
		function logObserversChange() {
			const observers = dedupeArray(actualObservers)
			if (arrayRefEquals(observers, prevObservers)) return
			logObservers(name, observers, prevObservers)
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

export function debugSignals(
	source: Many<Accessor<unknown>> | SignalState<unknown>[],
	options: DebugSignalOptions = {},
): void {
	let signals: SolidSignal[] = []
	asArray(source).forEach(s => {
		if (typeof s === "function") signals.push.apply(signals, getFunctionSources(s))
		else signals.push(s as SolidSignal)
	})
	if (signals.length === 0) return console.warn("No signals were passed to debugSignals")

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

export function debugOwnerSignals(owner?: Owner, options: DebugSignalOptions = {}) {
	owner = getOwner()!
	if (!owner) return console.warn("debugOwnerState found no Owner")
	if (markDebugNode(owner, "signals")) return

	const solidOwner = owner as SolidOwner

	let prevSourceListLength = 0
	let prevOwnedLength = 0

	makeSolidUpdateListener(() => {
		const signals: SolidSignal[] = []

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
