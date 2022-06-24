import { asArray } from "@solid-primitives/utils"
import { getOwner, OwnerType, SolidComputation, SolidSignal } from "@shared/graph"
import { getOwnerType, getOwnerName, isComputation } from "@solid-devtools/debugger"

type ComputationState = {
	owned: SolidComputation[] | null
	prev: unknown
	value: unknown
	sources: (SolidComputation | SolidSignal)[] | null
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

const makeTimeMeter = () => {
	let last = performance.now()
	return () => {
		const now = performance.now()
		const diff = now - last
		last = now
		return Math.round(diff)
	}
}

const logComputationDetails = (
	{ sources, owned, prev, value }: Readonly<ComputationState>,
	usesValue: boolean,
) => {
	if (usesValue) {
		console.log(inGray("Value ="), value)
		console.log(inGray("Previous ="), prev)
	}

	// Sources
	sources = sources ? dedupeArray(sources) : []
	if (sources.length) {
		console.groupCollapsed(inGray("Sources:"), sources.length)
		sources.forEach(source => {
			// Memo
			if ("owned" in source)
				console.log(`%c${source.name}%c ${inGray("=")}`, STYLES.grayBackground, "", source.value)
			// Signal
			else console.log(`${source.name ?? "(anonymous)"} ${inGray("=")}`, source.value)
		})
		console.groupEnd()
	} else {
		console.log(inGray("Sources:"), 0)
	}

	// Owned
	owned = owned ?? []
	if (owned.length) {
		console.groupCollapsed(inGray("Owned:"), owned.length)
		owned.forEach(owned => console.log(`%c${owned.name}`, STYLES.grayBackground))
		console.groupEnd()
	} else {
		console.log(inGray("Owned:"), 0)
	}
}

const logComputation = (
	groupLabel: string | string[],
	{ sources, owned, prev, value }: Readonly<ComputationState>,
	usesValue: boolean,
) => {
	console.groupCollapsed(...asArray(groupLabel))
	logComputationDetails({ sources, owned, prev, value }, usesValue)
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
	// log value and prev value only of the computation callback uses it
	const usesValue = !!owner.fn.length

	// solid reads "updatedAt" property right after it executes the "fn" callback
	// https://github.com/solidjs/solid/blob/main/packages/solid/src/reactive/signal.ts#L1287
	// this is for logging the initial state after the first callback execution
	// the "updatedAt" property is monkey patched for one function execution
	// and then patched back to the original value
	let updatedAt = owner.updatedAt
	Object.defineProperty(owner, "updatedAt", {
		get() {
			logComputation(
				[`%c${typeName} %c${name}%c created  ${styleTime(time())}`, "", STYLES.ownerName, ""],
				{
					owned: owner.owned,
					sources: owner.sources,
					prev: undefined,
					value: owner.value,
				},
				usesValue,
			)
			Object.defineProperty(owner, "updatedAt", {
				value: updatedAt,
				writable: true,
			})
			return updatedAt
		},
		set: v => (updatedAt = v),
	})

	// monkey patch the "fn" callback to intercept every computation function execution
	const fn = owner.fn
	owner.fn = prev => {
		time()
		const value = fn(prev)

		logComputation(
			[`%c${name}%c reran  ${styleTime(time())}`, STYLES.ownerName, ""],
			{
				owned: owner.owned,
				sources: owner.sources,
				prev,
				value,
			},
			usesValue,
		)

		return value
	}

	const time = makeTimeMeter()
}
