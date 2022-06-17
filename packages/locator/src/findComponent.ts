import { MappedComponent } from "@shared/graph"
import { LOCATION_ATTRIBUTE_NAME } from "@shared/variables"
import { isMac } from "@solid-primitives/platform"
import { SelectedComponent } from "."
import { ElementLocation } from "./goToSource"

const LOC_ATTR_REGEX_WIN = /^((?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+):([0-9]+):([0-9]+)$/
const LOC_ATTR_REGEX_MAC = /^((?:[^\\:*?"<>|]+\/)*[^\\/:*?"<>|]+):([0-9]+):([0-9]+)$/

export function getLocationFromAttribute(value: string): ElementLocation | null {
	const match = value.match(isMac ? LOC_ATTR_REGEX_MAC : LOC_ATTR_REGEX_WIN)
	if (!match) return null
	const [, filePath, line, column] = match
	return {
		filePath,
		line: +line,
		column: +column,
	}
}

const findComponentCache = new Map<HTMLElement, SelectedComponent | null>()

export function findComponent(
	comps: MappedComponent[],
	target: HTMLElement | null,
): SelectedComponent | null {
	if (!target) return null
	const checked: HTMLElement[] = []
	const toCheck = [target]
	let location: SelectedComponent["location"] = null

	for (const el of toCheck) {
		if (!location) {
			const locAttr = el.attributes.getNamedItem(LOCATION_ATTRIBUTE_NAME)
			if (locAttr) {
				const loc = getLocationFromAttribute(locAttr.value)
				if (loc) location = { ...loc, element: el }
			}
		}

		const cached = findComponentCache.get(el)
		if (cached !== undefined) {
			checked.forEach(cel => findComponentCache.set(cel, cached))
			return cached
				? {
						...cached,
						location: location ?? cached.location,
				  }
				: null
		}

		checked.push(el)

		for (let i = comps.length - 1; i >= 0; i--) {
			const comp = comps[i]
			if (
				(Array.isArray(comp.resolved) && comp.resolved.some(e => e === el)) ||
				el === comp.resolved
			) {
				const obj = {
					name: comp.name,
					element: el,
					location,
				}
				checked.forEach(cel => findComponentCache.set(cel, obj))
				return obj
			}
		}
		el.parentElement && toCheck.push(el.parentElement)
	}

	checked.forEach(cel => findComponentCache.set(cel, null))
	return null
}

export const clearFindComponentCache = () => findComponentCache.clear()
