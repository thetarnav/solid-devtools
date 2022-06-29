// see https://developer.chrome.com/docs/devtools/console/format-style/
// to gen a overview of how to style console messages

import { OwnerType, SolidComputation, SolidOwner, SolidSignal } from "@shared/graph"
import { dedupeArray } from "@shared/utils"
import { getName, getOwnerName, getOwnerType, isSolidOwner } from "@solid-devtools/debugger"
import { asArray } from "@solid-primitives/utils"

export type UpdateCause = {
	type: "signal" | "computation"
	name: string
	value: unknown
}

export const UNUSED = Symbol("unused")

export type ComputationState = {
	owned: SolidComputation[]
	prev: unknown | typeof UNUSED
	value: unknown | typeof UNUSED
	sources: (SolidComputation | SolidSignal)[]
	causedBy: UpdateCause[] | null
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

function getValueSpecifier(v: unknown) {
	if (typeof v === "object") return " %o"
	if (typeof v === "function") return " %O"
	return ""
}

const getNameStyle = (type: "Signal" | "Memo"): string =>
	type === "Signal" ? STYLES.signalUnderline : STYLES.grayBackground

export const getComputationCreatedLabel = (
	type: string,
	name: string,
	timeElapsed: number,
): string[] => [
	`%c${type} %c${name}%c created  ${styleTime(timeElapsed)}`,
	"",
	STYLES.ownerName,
	"",
]
export const getComputationRerunLabel = (name: string, timeElapsed: number): string[] => [
	`%c${name}%c re-executed  ${styleTime(timeElapsed)}`,
	STYLES.ownerName,
	"",
]
export const getOwnerDisposedLabel = (name: string): string[] => [
	`%c${name}%c disposed`,
	STYLES.ownerName,
	"",
]

export function logPrevValue(prev: unknown): void {
	console.log(`${inGray("Previous =")}${getValueSpecifier(prev)}`, prev)
}

export const logComputationDetails = ({
	causedBy,
	owned,
	sources,
	prev,
	value,
}: Readonly<ComputationState>) => {
	// Value
	if (value !== UNUSED) console.log(`${inGray("Value =")}${getValueSpecifier(value)}`, value)
	if (prev !== UNUSED) logPrevValue(prev)

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
			const type = isSolidOwner(source) ? "Memo" : "Signal"
			console.log(`%c${getName(source)}%c ${inGray("=")}`, getNameStyle(type), "", source.value)
		})
		console.groupEnd()
	} else {
		console.log(inGray("Sources:"), 0)
	}

	// Owned
	if (owned.length) {
		console.groupCollapsed(inGray("Owned:"), owned.length)
		logOwnerList(owned)
		console.groupEnd()
	} else {
		console.log(inGray("Owned:"), 0)
	}
}

export const logComputation = (groupLabel: string[], state: Readonly<ComputationState>) => {
	console.groupCollapsed(...groupLabel)
	logComputationDetails(state)
	console.groupEnd()
}

export function logOwned(type: string, name: string, owned: SolidComputation[]) {
	console.group(`Owned by the %c${name}%c ${type}:`, STYLES.ownerName, "")

	logOwnerList(owned, (owner, type) => {
		const sources = owner.sources ? dedupeArray(owner.sources) : []
		const usesPrev = !!owner.fn.length
		const usesValue = usesPrev || type === "Memo"
		logComputationDetails({
			owned: owner.owned ?? [],
			sources,
			prev: UNUSED,
			value: usesValue ? owner.value : UNUSED,
			causedBy: null,
		})
	})

	console.groupEnd()
}

export function logSignalsInitialValues(signals: SolidSignal[]) {
	console.groupCollapsed("Signals initial values:")
	logSignalValues(signals)
	console.groupEnd()
}

export function logSignalInitialValue(signal: SolidSignal): void {
	const type = isSolidOwner(signal) ? "Memo" : "Signal"
	const name = getName(signal)
	logInitialValue(type, name, signal.value)
}

export const logInitialValue = (type: "Signal" | "Memo", name: string, value: unknown): void =>
	console.log(
		`%c${type} %c${name}%c initial value ${inGray("=")}${getValueSpecifier(value)}`,
		"",
		`${STYLES.bold} ${getNameStyle(type)}`,
		"",
		value,
	)

export function logSignalValues(signals: SolidSignal[]): void {
	signals.forEach(signal => {
		const type = isSolidOwner(signal) ? "Memo" : "Signal"
		const name = getName(signal)

		console.log(
			`${inGray(type)} %c${name}%c ${inGray("=")}${getValueSpecifier(signal.value)}`,
			`${getNameStyle(type)}`,
			"",
			signal.value,
		)
	})
}

export function logSignalValueUpdate(
	type: "Signal" | "Memo",
	name: string,
	value: unknown,
	prev: unknown,
	observers?: SolidComputation[],
): void {
	console.groupCollapsed(
		`%c${name}%c updated ${inGray("=")}${getValueSpecifier(value)}`,
		`${STYLES.bold} ${getNameStyle(type)}`,
		"",
		value,
	)
	logPrevValue(prev)
	observers && logCausedUpdates(observers)
	console.groupEnd()
}

function getPaddedOwnerTypes<T extends SolidOwner>(owners: T[]): [owner: T, type: string][] {
	let typeLength = 0
	const types: [owner: T, type: string][] = []
	if (!owners.length) []
	owners.forEach(owner => {
		const typeName = OwnerType[getOwnerType(owner)]
		typeLength = Math.max(typeName.length, typeLength)
		types.push([owner, typeName])
	})
	types.forEach(pair => (pair[1] = pair[1].padEnd(typeLength)))
	return types
}

export function logOwnerList<T extends SolidOwner>(
	owners: T[],
	logGroup?: (owner: T, type: string) => void,
): void {
	const types = getPaddedOwnerTypes(owners)
	types.forEach(([owner, type]) => {
		const label = [`${inGray(type)} %c${getName(owner)}`, STYLES.grayBackground]
		if (logGroup) {
			console.groupCollapsed(...label)
			logGroup(owner, type)
			console.groupEnd()
		} else console.log(...label)
	})
}

function logCausedUpdates(observers: SolidComputation[]): void {
	if (!observers.length) return
	console.groupCollapsed(inGray("Caused Updates:"), observers.length)
	logOwnerList(observers)
	console.groupEnd()
}

export function logObservers(
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
	const marks = new WeakMap<SolidOwner, "added" | "removed" | null>()
	const owners: SolidOwner[] = []
	prevObservers.forEach(observer => {
		marks.set(observer, observers.includes(observer) ? null : "removed")
		owners.push(observer)
	})
	observers.forEach(observer => {
		if (prevObservers.includes(observer)) return
		marks.set(observer, "added")
		owners.push(observer)
	})
	const types = getPaddedOwnerTypes(owners)
	types.forEach(([owner, type]) => {
		const mark = marks.get(owner)
		const name = getOwnerName(owner)
		switch (mark) {
			case "added":
				console.log(
					`${inGray(type)} %c${name}%c  new`,
					STYLES.grayBackground,
					"color: orange; font-style: italic",
				)
				break

			case "removed":
				console.log(
					`${inGray(type)} %c${name}`,
					"background: rgba(153, 153, 153, 0.15); padding: 0 0.2em; border-radius: 4px; text-decoration: line-through; color: #888",
				)
				break

			default:
				console.log(`${inGray(type)} %c${name}`, STYLES.grayBackground)
				break
		}
	})
	console.groupEnd()
}
