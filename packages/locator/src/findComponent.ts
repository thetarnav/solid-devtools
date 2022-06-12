import { Accessor } from "solid-js"
import type { ElementLocation } from "@solid-devtools/babel-plugin"
import { MappedComponent } from "@shared/graph"
import { LOCATION_ATTRIBUTE_NAME } from "@shared/variables"
import { SelectedComponent } from "."

const LOC_ATTR_REGEX = /^((?:[a-zA-Z]:\\)?(?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+):([0-9]+):([0-9]+)$/
export function getLocationFromAttribute(value: string): ElementLocation | null {
	const match = value.match(LOC_ATTR_REGEX)
	if (!match) return null
	const [, path, line, column] = match
	return {
		path,
		line: +line,
		column: +column,
	}
}

const findComponentCache = new Map<HTMLElement, SelectedComponent | null>()

export function findComponent(
	this: Accessor<MappedComponent[]>,
	getTarget: Accessor<HTMLElement | null>,
): SelectedComponent | null {
	const target = getTarget()
	if (!target) return null
	const comps = this()
	const checked: HTMLElement[] = []
	const toCheck = [target]
	let location: SelectedComponent["location"] = null
	for (const el of toCheck) {
		const cached = findComponentCache.get(el)
		if (cached !== undefined) {
			for (const cel of checked) findComponentCache.set(cel, cached)
			return cached
		}

		if (!location) {
			const locAttr = el.attributes.getNamedItem(LOCATION_ATTRIBUTE_NAME)
			if (locAttr) {
				const loc = getLocationFromAttribute(locAttr.value)
				if (loc) location = { ...loc, element: el }
			}
		}

		checked.push(el)
		for (const comp of comps) {
			if (el === comp.element) {
				const obj = {
					...comp,
					location,
				}
				for (const cel of checked) findComponentCache.set(cel, obj)
				return obj
			}
		}
		el.parentElement && toCheck.push(el.parentElement)
	}
	for (const cel of checked) findComponentCache.set(cel, null)
	return null
}

export const clearFindComponentCache = () => findComponentCache.clear()
