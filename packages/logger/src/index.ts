import { asArray } from "@solid-primitives/utils"
import { getOwner, OwnerType, SolidComputation, SolidSignal } from "@shared/graph"
import {
	getOwnerType,
	getOwnerName,
	isComputation,
	onOwnerCleanup,
	observeValueUpdate,
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
}

const STYLES = {
	ownerName:
		"font-weight: bold; font-size: 1.1em; background: rgba(153, 153, 153, 0.3); padding: 0.1em 0.3em; border-radius: 4px;",
	grayBackground: "background: rgba(153, 153, 153, 0.3); padding: 0 0.2em; border-radius: 4px;",
}

const inGray = (text: unknown) => `\x1B[90m${text}\x1B[m`
const styleTime = (time: number) => `\x1B[90;3m${time} ms\x1B[m`

const dedupeArray = <T>(array: T[]) => Array.from(new Set(array))

const getName = (o: { name?: string }) => o.name ?? "(anonymous)"

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
				`%c${inGray("Caused By:")} %c${getName(causedBy[0])}%c ${inGray("=")}`,
				"",
				"owned" in causedBy[0] ? STYLES.grayBackground : "",
				"",
				causedBy[0].value,
			)
		else {
			console.groupCollapsed(inGray("Caused By:"), causedBy.length)
			causedBy.forEach(cause => {
				console.log(
					`%c${getName(cause)}%c ${inGray("=")}`,
					cause.type === "computation" ? STYLES.grayBackground : "",
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
				isComputation(source) ? STYLES.grayBackground : "",
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
	if (owner.owner)
		onOwnerCleanup(
			owner.owner,
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
