import { MappedComponent } from "@shared/graph"
import { Accessor } from "solid-js"

const findComponentCache = new Map<Element, MappedComponent | null>()

export function findComponent(
	this: Accessor<MappedComponent[]>,
	getTarget: Accessor<Element | null>,
): MappedComponent | null {
	const target = getTarget()
	if (!target) return null
	const comps = this()
	const checked: Element[] = []
	const toCheck = [target]
	for (const el of toCheck) {
		const cached = findComponentCache.get(el)
		if (cached !== undefined) {
			for (const cel of checked) findComponentCache.set(cel, cached)
			return cached
		}
		checked.push(el)
		for (const comp of comps) {
			if (el === comp.element) {
				for (const cel of checked) findComponentCache.set(cel, comp)
				return comp
			}
		}
		el.parentElement && toCheck.push(el.parentElement)
	}
	for (const cel of checked) findComponentCache.set(cel, null)
	return null
}

export const clearFindComponentCache = () => findComponentCache.clear()
