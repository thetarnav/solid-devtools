import { arrayEquals, asArray } from "@solid-primitives/utils"
import { getOwner, OwnerType, SolidComputation, SolidOwner, SolidSignal } from "@shared/graph"
import {
	getOwnerType,
	getOwnerName,
	isComputation,
	observeValueUpdate,
	onParentCleanup,
	getFunctionSources,
	makeSolidUpdateListener,
} from "@solid-devtools/debugger"

type UpdateCause = {
	type: "signal" | "computation"
	name: string
	value: unknown
}

const UNUSED = Symbol("unused")

type ComputationState = {
	owned: SolidComputation[]
	prev: unknown | typeof UNUSED
	value: unknown | typeof UNUSED
	sources: (SolidComputation | SolidSignal)[]
	causedBy: UpdateCause[] | null
}

declare module "solid-js/types/reactive/signal" {
	interface Owner {
		$debug?: boolean
	}
	interface SignalState<T> {
		$debug?: boolean
	}
}

const STYLES = {
	bold: "font-weight: bold; font-size: 1.1em;",
	ownerName:
		"font-weight: bold; font-size: 1.1em; background: rgba(153, 153, 153, 0.3); padding: 0.1em 0.3em; border-radius: 4px;",
	grayBackground: "background: rgba(153, 153, 153, 0.3); padding: 0 0.2em; border-radius: 4px;",
	signalUnderline: "text-decoration: orange wavy underline;",
}

const inGray = (text: unknown) => `\x1B[90m${text}\x1B[m`
const styleTime = (time: number) => `\x1B[90;3m${time} ms\x1B[m`

const dedupeArray = <T>(array: T[]) => Array.from(new Set(array))

const getName = (o: SolidSignal | SolidOwner) =>
	isComputation(o) ? getOwnerName(o) : o.name ?? "(unnamed)"

const makeTimeMeter = () => {
	let last = performance.now()
	return () => {
		const now = performance.now()
		const diff = now - last
		last = now
		return Math.round(diff)
	}
}

const logComputationDetails = ({
	causedBy,
	owned,
	sources,
	prev,
	value,
}: Readonly<ComputationState>) => {
	// Value
	if (value !== UNUSED) console.log(inGray("Value ="), value)
	if (prev !== UNUSED) console.log(inGray("Previous ="), prev)

	// Caused By
	if (causedBy && causedBy.length) {
		if (causedBy.length === 1)
			console.log(
				`%c${inGray("Caused By:")} %c${causedBy[0].name}%c ${inGray("=")}`,
				"",
				"owned" in causedBy[0] ? STYLES.grayBackground : STYLES.signalUnderline,
				"",
				causedBy[0].value,
			)
		else {
			console.groupCollapsed(inGray("Caused By:"), causedBy.length)
			causedBy.forEach(cause => {
				console.log(
					`%c${cause.name}%c ${inGray("=")}`,
					cause.type === "computation" ? STYLES.grayBackground : STYLES.signalUnderline,
					"",
					cause.value,
				)
			})
			console.groupEnd()
		}
	}

	// Sources
	if (sources.length) {
		console.groupCollapsed(inGray("Sources:"), sources.length)
		sources.forEach(source => {
			console.log(
				`%c${getName(source)}%c ${inGray("=")}`,
				isComputation(source) ? STYLES.grayBackground : STYLES.signalUnderline,
				"",
				source.value,
			)
		})
		console.groupEnd()
	} else {
		console.log(inGray("Sources:"), 0)
	}

	// Owned
	if (owned.length) {
		console.groupCollapsed(inGray("Owned:"), owned.length)
		owned.forEach(owned => console.log(`%c${owned.name}`, STYLES.grayBackground))
		console.groupEnd()
	} else {
		console.log(inGray("Owned:"), 0)
	}
}

const logComputation = (groupLabel: string | string[], state: Readonly<ComputationState>) => {
	console.groupCollapsed(...asArray(groupLabel))
	logComputationDetails(state)
	console.groupEnd()
}

export function debugComputation() {
	const owner = getOwner()
	if (!owner || !isComputation(owner)) return console.warn("owner is not a computation")

	if (owner.$debug) return
	owner.$debug = true

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
						type: isComputation(source) ? "computation" : "signal",
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

			logComputation(
				[`%c${typeName} %c${name}%c created  ${styleTime(timeElapsed)}`, "", STYLES.ownerName, ""],
				{
					owned: owner.owned ?? [],
					sources,
					prev: UNUSED,
					value: usesValue ? value : UNUSED,
					causedBy: null,
				},
			)
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
		logComputation([`%c${name}%c re-executed  ${styleTime(elapsedTime)}`, STYLES.ownerName, ""], {
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
			console.log(`%c${name}%c disposed`, STYLES.ownerName, "")
			updateListeners.forEach(unsub => unsub())
			updateListeners.length = 0
			signalUpdates.length = 0
		},
		// run before other cleanup functions
		true,
	)

	const time = makeTimeMeter()
}

function logCausedUpdates(observers: SolidComputation[]): void {
	if (!observers.length) return
	console.groupCollapsed(inGray("Caused Updates:"), observers.length)
	const toLog: [type: string, name: string][] = []
	let typeLength = 0
	observers.forEach(observer => {
		const type = OwnerType[getOwnerType(observer)]
		typeLength = Math.max(type.length, typeLength)
		toLog.push([type, getName(observer)])
	})
	toLog.forEach(([type, name]) => {
		console.log(`${inGray(type.padEnd(typeLength))} %c${name}`, STYLES.grayBackground)
	})
	console.groupEnd()
}

function logObservers(
	signalName: string,
	observers: SolidComputation[],
	prevObservers: SolidComputation[],
): void {
	const label = [
		`%c${signalName}%c observers changed:`,
		`${STYLES.bold} ${STYLES.signalUnderline}`,
		"",
		observers.length,
	]
	if (!observers.length && !prevObservers.length) return console.log(...label)
	console.groupCollapsed(...label)
	const toLog: [type: string, name: string, mark: "added" | "removed" | null][] = []
	let typeLength = 0
	prevObservers.forEach(observer => {
		const type = OwnerType[getOwnerType(observer)]
		typeLength = Math.max(type.length, typeLength)
		toLog.push([type, getName(observer), observers.includes(observer) ? null : "removed"])
	})
	observers.forEach(observer => {
		if (prevObservers.includes(observer)) return
		const type = OwnerType[getOwnerType(observer)]
		typeLength = Math.max(type.length, typeLength)
		toLog.push([type, getName(observer), "added"])
	})
	toLog.forEach(([type, name, mark]) => {
		const formattedType = inGray(type.padEnd(typeLength))
		switch (mark) {
			case "added":
				console.log(
					`${formattedType} %c${name}%c  new`,
					STYLES.grayBackground,
					"color: orange; font-style: italic",
				)
				break

			case "removed":
				console.log(
					`${formattedType} %c${name}`,
					"background: rgba(153, 153, 153, 0.15); padding: 0 0.2em; border-radius: 4px; text-decoration: line-through; color: #888",
				)
				break

			default:
				console.log(`${formattedType} %c${name}`, STYLES.grayBackground)
				break
		}
	})
	console.groupEnd()
}

function logPrevValue(prev: unknown): void {
	console.log(inGray("Previous:"), prev)
}

export function debugSignal(getter: () => unknown): void {
	const sources = getFunctionSources(getter)
	if (sources.length === 0) return console.warn("No signal was passed to debugSignal")
	else if (sources.length > 1) return console.warn("More then one signal was passed to debugSignal")

	const signal = sources[0]

	if (signal.$debug) return
	signal.$debug = true

	const isSignal = !isComputation(signal)
	const type = isSignal ? "Signal" : "Memo"
	const name = getName(signal)
	const SYMBOL = Symbol(name)

	// Initial
	console.log(
		`%c${type} %c${name}%c initial value ${inGray("=")}`,
		"",
		`${STYLES.bold} ${STYLES.signalUnderline}`,
		"",
		signal.value,
	)

	let actualObservers: SolidComputation[]
	let prevObservers: SolidComputation[] = []
	let actualPrevObservers: SolidComputation[] = []

	if (!signal.observers) {
		signal.observers = []
		signal.observerSlots = []
	}

	// Value Update
	observeValueUpdate(
		signal,
		(value, prev) => {
			console.groupCollapsed(
				`%c${name}%c updated ${inGray("=")}`,
				`${STYLES.bold} ${STYLES.signalUnderline}`,
				"",
				value,
			)
			logPrevValue(prev)
			logCausedUpdates(prevObservers)
			console.groupEnd()
		},
		SYMBOL,
	)

	// Observers Change
	function logObserversChange() {
		const observers = dedupeArray(actualObservers)
		if (arrayEquals(observers, prevObservers)) return
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
