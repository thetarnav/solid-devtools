import type { Owner } from "solid-js/types/reactive/signal"
import { AnyObject } from "@solid-primitives/utils"
import { MappedOwner, OwnerType } from "@shared/graph"

const isComponent = (o: Readonly<AnyObject>): boolean =>
	"componentName" in o && typeof o.value === "function"

const getOwnerName = (owner: Readonly<Owner>): string => {
	const { name, componentName: component } = owner
	if (component) return component.startsWith("_Hot$$") ? component.slice(6) : component
	return name || "(anonymous)"
}

const getOwnerType = (o: Readonly<AnyObject>, parentType?: OwnerType): OwnerType => {
	// TODO: how to figureout soli-refresh memos?
	// if (o.name?.startsWith("sr-cl:") && !o.name.includes("-", 6)) return "refresh";
	if (isComponent(o)) return OwnerType.Component
	if ("value" in o && "comparator" in o && o.pure === true) return OwnerType.Memo
	if (o.user === true && o.pure === false) OwnerType.Effect
	if (
		o.pure === false &&
		o.fn + "" === "(current) => insertExpression(parent, accessor(), current, marker)" &&
		(parentType === OwnerType.Component || parentType === OwnerType.Refresh)
	)
		return OwnerType.Render
	return OwnerType.Computation
}

function mapOwner(owner: Readonly<Owner>): MappedOwner {
	const mapped: MappedOwner = {
		name: getOwnerName(owner),
		type: getOwnerType(owner),
		children: mapChildren(owner),
	}
	return mapped
}

function mapChildren(owner: Readonly<Owner>): MappedOwner[] {
	if (!Array.isArray(owner.owned)) return []
	return owner.owned.map(child => mapOwner(child))
}

function mapOwnerTree(root: Readonly<Owner>): MappedOwner[] {
	return mapChildren(root)
}

export { mapOwnerTree }
