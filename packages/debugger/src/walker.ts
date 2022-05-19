import { AnyFunction, AnyObject } from "@solid-primitives/utils"
import {
	MappedNode,
	OwnerType,
	SolidOwner,
	MappedSignal,
	SolidSignal,
	MappedBase,
} from "@shared/graph"
import { SafeValue, UpdateType } from "@shared/messanger"
import { batchUpdate } from "./batchUpdates"
import { getSafeValue } from "./serialize"

const isComponent = (o: Readonly<AnyObject>): boolean =>
	"componentName" in o && typeof o.value === "function"

const isMemo = (o: Readonly<AnyObject>): boolean =>
	"value" in o && "comparator" in o && o.pure === true

const fnMatchesRefresh = (fn: AnyFunction): boolean =>
	(fn + "").replace(/[\n\t]/g, "").replace(/ +/g, " ") ===
	"() => { const c = source(); if (c) { return untrack(() => c(props)); } return undefined; }"

const getOwnerName = (owner: Readonly<SolidOwner>): string => {
	const { name, componentName: component } = owner
	if (component) return component.startsWith("_Hot$$") ? component.slice(6) : component
	return name || "(anonymous)"
}

const getOwnerType = (o: Readonly<AnyObject>, parentType: OwnerType): OwnerType => {
	// Precompiled components do not start with "_Hot$$"
	// we need a way to identify imported (3rd party) vs user components
	if (isComponent(o)) return OwnerType.Component
	if (isMemo(o)) {
		if (fnMatchesRefresh(o.fn)) return OwnerType.Refresh
		return OwnerType.Memo
	}
	// Effect
	if (o.pure === false) {
		if (o.user === true) return OwnerType.Effect
		return OwnerType.Render
	}
	return OwnerType.Computation
}

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
function observeComputation(owner: SolidOwner, onRun: VoidFunction) {
	const fn = owner.fn.bind(owner)
	owner.fn = (...a) => {
		onRun()
		return fn(...a)
	}
}

function observeSignalUpdate(
	signal: { value: unknown },
	onUpdate: (newValue: any, oldValue: any) => void,
): void {
	let value = signal.value
	let safeValue = getSafeValue(value)
	Object.defineProperty(signal, "value", {
		get: () => value,
		set: newValue => {
			const safe = getSafeValue(newValue)
			onUpdate(safe, safeValue)
			;(value = newValue), (safeValue = safe)
		},
	})
}

let LAST_ID = 0

function mapOwnerSignals(o: Readonly<SolidOwner>): MappedSignal[] {
	const { sourceMap } = o
	if (!sourceMap) return []
	return Object.values(sourceMap).map(raw => {
		let id: number
		if (raw.sdtId !== undefined) {
			id = raw.sdtId
		} else {
			raw.sdtId = id = LAST_ID++
			observeSignalUpdate(raw, (value, oldValue) =>
				batchUpdate({ type: UpdateType.Signal, payload: { id, value, oldValue } }),
			)
		}
		return {
			name: raw.name,
			id,
			value: getSafeValue(raw.value),
		}
	})
}

function mapOwner(owner: SolidOwner, parentType: OwnerType): MappedNode {
	let id: number
	if (owner.sdtId !== undefined) {
		id = owner.sdtId
	} else {
		owner.sdtId = id = LAST_ID++
		observeComputation(owner, () => batchUpdate({ type: UpdateType.Computation, payload: id }))
	}

	const type = getOwnerType(owner, parentType)

	let valueObj: { value: SafeValue } | undefined
	if (type === OwnerType.Memo) {
		observeSignalUpdate(owner, (value, oldValue) =>
			batchUpdate({ type: UpdateType.Signal, payload: { id, value, oldValue } }),
		)
		// ? do we need to send values with the graph if they are being observer seperately?
		valueObj = { value: getSafeValue(owner.value) }
	}

	const mapped: MappedBase = {
		id,
		name: getOwnerName(owner),
		type,
		signals: mapOwnerSignals(owner),
		children: mapChildren(owner, type),
		...valueObj,
	}
	return mapped as MappedNode
}

function mapChildren(owner: Readonly<SolidOwner>, parentType: OwnerType): MappedNode[] {
	if (!Array.isArray(owner.owned)) return []
	return owner.owned.map(child => mapOwner(child, parentType))
}

function mapOwnerTree(root: SolidOwner): MappedNode[] {
	return mapChildren(root, OwnerType.Component)
}

export { mapOwnerTree }
