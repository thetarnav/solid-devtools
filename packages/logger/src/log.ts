// see https://developer.chrome.com/docs/devtools/console/format-style/
// to gen a overview of how to style console messages

import { getName, getNodeType, getOwnerType, isSolidMemo } from "@solid-devtools/debugger"
import { NodeType, SolidComputation, SolidOwner, SolidSignal } from "@shared/graph"
import { dedupeArray } from "@shared/utils"

export type NodeState = {
	type: NodeType
	typeName: string
	name: string
}

export type NodeStateWithValue = {
	type: NodeType
	typeName: string
	name: string
	value: unknown
}

export const UNUSED = Symbol("unused")

export type ComputationState = {
	owned: SolidComputation[]
	owner: SolidOwner | NodeState | null | typeof UNUSED
	prev: unknown | typeof UNUSED
	value: unknown | typeof UNUSED
	sources: (SolidComputation | SolidSignal)[]
	causedBy: NodeStateWithValue[] | null
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

const getNameStyle = (type: NodeType): string =>
	type === NodeType.Signal ? STYLES.signalUnderline : STYLES.grayBackground

/** function that trims too long string */
function trimString(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str
	return str.slice(0, maxLength) + "…"
}

export const getDisplayName = (node: Readonly<SolidOwner | SolidSignal>): string =>
	trimString(getName(node), 20)

function getValueSpecifier(v: unknown) {
	if (typeof v === "object") return " %o"
	if (typeof v === "function") return " %O"
	return ""
}

export function getNodeState(owner: SolidOwner | SolidSignal | NodeState): NodeState {
	if ("type" in owner && "typeName" in owner && "name" in owner) return owner
	const type = getNodeType(owner)
	return {
		type,
		typeName: NodeType[type],
		name: getDisplayName(owner),
	}
}
export function getNodeStateWithValue(
	owner: SolidComputation | SolidSignal | NodeStateWithValue,
): NodeStateWithValue {
	if ("type" in owner && "typeName" in owner && "name" in owner) return owner
	const type = getNodeType(owner)
	return {
		type,
		typeName: NodeType[type],
		name: getDisplayName(owner),
		value: owner.value,
	}
}

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
	owner,
	owned,
	sources,
	prev,
	value,
}: Readonly<ComputationState>) => {
	// Owner
	if (owner !== UNUSED) {
		const label = inGray("Owner:")
		if (!owner) console.log(label, null)
		else {
			const { name } = getNodeState(owner)
			console.log(`${label} %c${name}`, STYLES.grayBackground)
		}
	}

	// Value
	if (value !== UNUSED) console.log(`${inGray("Value =")}${getValueSpecifier(value)}`, value)
	if (prev !== UNUSED) logPrevValue(prev)

	// Caused By
	if (causedBy && causedBy.length) {
		if (causedBy.length === 1) {
			const { name, type, value } = causedBy[0]
			console.log(
				`%c${inGray("Caused By:")} %c${name}%c ${inGray("=")}`,
				"",
				getNameStyle(type),
				"",
				value,
			)
		} else {
			console.groupCollapsed(inGray("Caused By:"), causedBy.length)
			causedBy.forEach(({ name, type, value }) => {
				console.log(`%c${name}%c ${inGray("=")}`, getNameStyle(type), "", value)
			})
			console.groupEnd()
		}
	}

	// Sources
	if (sources.length) {
		console.groupCollapsed(inGray("Sources:"), sources.length)
		sources.forEach(source => {
			const { type, name } = getNodeState(source)
			console.log(`%c${name}%c ${inGray("=")}`, getNameStyle(type), "", source.value)
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

export function logOwned(
	ownerState: NodeState,
	owned: Readonly<SolidComputation[]>,
	prevOwned: Readonly<SolidComputation[]>,
) {
	console.groupCollapsed(
		`Owned by the %c${ownerState.name}%c ${ownerState.typeName}:`,
		STYLES.ownerName,
		"",
		owned.length,
	)

	logOwnersDiff(prevOwned, owned, "stack", owner => {
		const sources = owner.sources ? dedupeArray(owner.sources) : []
		const usesPrev = !!owner.fn.length
		const usesValue = usesPrev || isSolidMemo(owner)
		logComputationDetails({
			owner: ownerState,
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

export function logInitialValue(node: SolidSignal | NodeStateWithValue): void {
	const { type, typeName, value, name } = getNodeStateWithValue(node)
	console.log(
		`%c${typeName} %c${name}%c initial value ${inGray("=")}${getValueSpecifier(value)}`,
		"",
		`${STYLES.bold} ${getNameStyle(type)}`,
		"",
		value,
	)
}

export function logSignalValues(signals: SolidSignal[]): void {
	signals.forEach(signal => {
		const { type, typeName, name, value } = getNodeStateWithValue(signal)
		console.log(
			`${inGray(typeName)} %c${name}%c ${inGray("=")}${getValueSpecifier(value)}`,
			`${getNameStyle(type)}`,
			"",
			value,
		)
	})
}

export function logSignalValueUpdate(
	{ name, type }: NodeState,
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

function getPaddedOwnerTypes<T extends SolidOwner>(
	owners: readonly T[],
): [owner: T, type: string][] {
	let typeLength = 0
	const types: [owner: T, type: string][] = []
	if (!owners.length) []
	owners.forEach(owner => {
		const typeName = NodeType[getOwnerType(owner)]
		typeLength = Math.max(typeName.length, typeLength)
		types.push([owner, typeName])
	})
	types.forEach(pair => (pair[1] = pair[1].padEnd(typeLength)))
	return types
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
	logOwnersDiff(prevObservers, observers, "thorow")
	console.groupEnd()
}

function getThorowOwnersDiff<T extends SolidOwner>(
	from: Readonly<T[]>,
	to: Readonly<T[]>,
): [WeakMap<T, "added" | "removed">, T[]] {
	const marks = new WeakMap<T, "added" | "removed">()
	const owners: T[] = []
	const toCopy = [...to]

	from.forEach(owner => {
		const index = toCopy.indexOf(owner)
		if (index !== -1) toCopy.splice(index, 1)
		else marks.set(owner, "removed")
		owners.push(owner)
	})
	toCopy.forEach(owner => {
		if (owners.includes(owner)) return
		marks.set(owner, "added")
		owners.push(owner)
	})

	return [marks, owners]
}

function getStackOwnersDiff<T extends SolidOwner>(
	from: Readonly<T[]>,
	to: Readonly<T[]>,
): [WeakMap<T, "added">, T[]] {
	const marks = new WeakMap<T, "added">()
	const owners: T[] = [...from]
	for (let i = owners.length; i < to.length; i++) {
		owners.push(to[i])
		marks.set(to[i], "added")
	}
	return [marks, owners]
}

function logOwnersDiff<T extends SolidOwner>(
	from: Readonly<T[]>,
	to: Readonly<T[]>,
	diff: "thorow" | "stack",
	logGroup?: (owner: T) => void,
): void {
	const [marks, owners] =
		diff === "thorow" ? getThorowOwnersDiff(from, to) : getStackOwnersDiff(from, to)
	const types = getPaddedOwnerTypes(owners)

	types.forEach(([owner, type]) => {
		const mark = marks.get(owner)
		const name = getDisplayName(owner)
		const label = (() => {
			if (mark === "added")
				return [
					`${inGray(type)} %c${name}%c  new`,
					STYLES.grayBackground,
					"color: orange; font-style: italic",
				]
			if (mark === "removed")
				return [
					`${inGray(type)} %c${name}`,
					"background: rgba(153, 153, 153, 0.15); padding: 0 0.2em; border-radius: 4px; text-decoration: line-through; color: #888",
				]
			return [`${inGray(type)} %c${name}`, STYLES.grayBackground]
		})()
		if (logGroup) {
			console.groupCollapsed(...label)
			logGroup(owner)
			console.groupEnd()
		} else console.log(...label)
	})
}

export function logOwnerList<T extends SolidOwner>(
	owners: readonly T[],
	logGroup?: (owner: T) => void,
): void {
	const types = getPaddedOwnerTypes(owners)
	types.forEach(([owner, type]) => {
		const label = [`${inGray(type)} %c${getDisplayName(owner)}`, STYLES.grayBackground]
		if (logGroup) {
			console.groupCollapsed(...label)
			logGroup(owner)
			console.groupEnd()
		} else console.log(...label)
	})
}
