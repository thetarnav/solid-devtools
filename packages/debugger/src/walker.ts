import { AnyFunction, AnyObject } from "@solid-primitives/utils"
import { MappedOwner, OwnerType, Owner } from "@shared/graph"
import { computationRun } from "./update"

const isComponent = (o: Readonly<AnyObject>): boolean =>
	"componentName" in o && typeof o.value === "function"

const isMemo = (o: Readonly<AnyObject>): boolean =>
	"value" in o && "comparator" in o && o.pure === true

const fnMatchesRefresh = (fn: AnyFunction): boolean =>
	(fn + "").replace(/[\n\t]/g, "").replace(/ +/g, " ") ===
	"() => { const c = source(); if (c) { return untrack(() => c(props)); } return undefined; }"

const fnMatchesRender = (fn: AnyFunction): boolean => {
	const string = fn + ""
	return (
		string === "(current) => insertExpression(parent, accessor(), current, marker)" ||
		string === "() => current = insertExpression(parent, array, current, marker, true)"
	)
}
// previous Render type check: (o.pure === false && (!o.owned || o.value + "" === "() => current") && fnMatchesRender(o.fn))

const getOwnerName = (owner: Readonly<Owner>): string => {
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
		if (o.user === true) return OwnerType.UserEffect
		return OwnerType.Effect
	}
	return OwnerType.Computation
}

function listenToComputation(owner: Owner, onRun: VoidFunction) {
	const { fn } = owner
	owner.fn = (...a) => (fn(...a), onRun())
}

let LAST_OWNER_ID = 0

function mapOwner(owner: Owner, parentType: OwnerType): MappedOwner {
	let id: number
	if (owner.sdtId !== undefined) {
		id = owner.sdtId
	} else {
		owner.sdtId = id = LAST_OWNER_ID++
		listenToComputation(owner, computationRun.bind(void 0, id))
	}

	const type = getOwnerType(owner, parentType)
	const mapped: MappedOwner = {
		id,
		name: getOwnerName(owner),
		type,
		children: mapChildren(owner, type),
	}
	return mapped
}

function mapChildren(owner: Owner, parentType: OwnerType): MappedOwner[] {
	if (!Array.isArray(owner.owned)) return []
	return owner.owned.map(child => mapOwner(child, parentType))
}

function mapOwnerTree(root: Owner): MappedOwner[] {
	return mapChildren(root, OwnerType.Component)
}

export { mapOwnerTree }
