import { MappedComponent } from "@solid-devtools/shared/graph"
import { LOCATION_ATTRIBUTE_NAME } from "@solid-devtools/shared/variables"
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

export function getLocationFromElement(element: Element): ElementLocation | null {
  const locAttr = element.getAttribute(LOCATION_ATTRIBUTE_NAME)
  return locAttr ? getLocationFromAttribute(locAttr) : null
}

const findComponentCache = new Map<HTMLElement, SelectedComponent | null>()

/**
 * Given an array of components and a HTML Element, find the closest component that contains the element.
 *
 * All the finds are stored in a cache to avoid re-computation. To clear the cache, use `clearFindComponentCache()`.
 *
 * @param comps An array of MappedComponents
 * @param target HTMLElement to find the component for
 * @returns A SelectedComponent or null if no component was found. Selected component contains also a source code location property.
 */
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
      const loc = getLocationFromElement(el)
      if (loc) location = { ...loc, element: el }
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

/**
 * Clear the find component cache.
 */
export const clearFindComponentCache = () => findComponentCache.clear()
