import { OwnerType, SolidComputation, SolidOwner, SolidSignal } from "@shared/graph"
import { getName, getOwnerType, isComputation } from "@solid-devtools/debugger"
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
	console.log(inGray("Previous:"), prev)
}

export const logComputationDetails = ({
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
		logOwnerList(owned)
		console.groupEnd()
	} else {
		console.log(inGray("Owned:"), 0)
	}
}

export const logComputation = (
	groupLabel: string | string[],
	state: Readonly<ComputationState>,
) => {
	console.groupCollapsed(...asArray(groupLabel))
	logComputationDetails(state)
	console.groupEnd()
}

export const logInitialValue = (type: string, name: string, value: unknown): void =>
	console.log(
		`%c${type} %c${name}%c initial value ${inGray("=")}`,
		"",
		`${STYLES.bold} ${STYLES.signalUnderline}`,
		"",
		value,
	)

export function logSignalValueUpdate(
	name: string,
	value: unknown,
	prev: unknown,
	observers?: SolidComputation[],
): void {
	console.groupCollapsed(
		`%c${name}%c updated ${inGray("=")}`,
		`${STYLES.bold} ${STYLES.signalUnderline}`,
		"",
		value,
	)
	logPrevValue(prev)
	observers && logCausedUpdates(observers)
	console.groupEnd()
}

export function logOwnerList(owners: SolidOwner[]): void {
	const toLog: [type: string, name: string][] = []
	let typeLength = 0
	owners.forEach(owner => {
		const type = OwnerType[getOwnerType(owner)]
		typeLength = Math.max(type.length, typeLength)
		toLog.push([type, getName(owner)])
	})
	toLog.forEach(([type, name]) => {
		console.log(`${inGray(type.padEnd(typeLength))} %c${name}`, STYLES.grayBackground)
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
