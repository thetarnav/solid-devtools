import { AnyFunction, AnyObject } from "@solid-primitives/utils"
import { OwnerType, SolidOwner } from "@shared/graph"
import { SafeValue } from "@shared/messanger"

export const isComponent = (o: Readonly<AnyObject>): boolean =>
	"componentName" in o && typeof o.value === "function"

export const isMemo = (o: Readonly<AnyObject>): boolean =>
	"value" in o && "comparator" in o && o.pure === true

export const fnMatchesRefresh = (fn: AnyFunction): boolean =>
	(fn + "").replace(/[\n\t]/g, "").replace(/ +/g, " ") ===
	"() => { const c = source(); if (c) { return untrack(() => c(props)); } return undefined; }"

export const getOwnerName = (owner: Readonly<SolidOwner>): string => {
	const { name, componentName: component } = owner
	if (component) return component.startsWith("_Hot$$") ? component.slice(6) : component
	return name || "(anonymous)"
}

export const getOwnerType = (o: Readonly<AnyObject>): OwnerType => {
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

const literalTypes = ["bigint", "number", "boolean", "string", "undefined"]

export function getSafeValue(value: unknown): SafeValue {
	if (literalTypes.includes(typeof value)) return value as SafeValue
	return value + ""
}

/** helper to getting to an owner that you want */
export function findOwner(
	root: SolidOwner,
	predicate: (owner: SolidOwner) => boolean,
): SolidOwner | null {
	const queue: SolidOwner[] = [root]
	for (const owner of queue) {
		if (predicate(owner)) return owner
		if (Array.isArray(owner.owned)) queue.push(...owner.owned)
	}
	return null
}

let LAST_ID = 0
export const getNewSdtId = () => LAST_ID++

export function markOwnerType(o: SolidOwner): OwnerType {
	if (o.sdtType !== undefined) return o.sdtType
	else return (o.sdtType = getOwnerType(o))
}
export function markNodeID(o: { sdtId?: number }): number {
	if (o.sdtId !== undefined) return o.sdtId
	else return (o.sdtId = getNewSdtId())
}
export function markNodesID(nodes?: { sdtId?: number }[] | null): number[] {
	if (!nodes || !nodes.length) return []
	return nodes.map(markNodeID)
}
