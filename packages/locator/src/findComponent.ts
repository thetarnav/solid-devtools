import { Mapped, NodeID } from "@solid-devtools/shared/graph"
import { LOCATION_ATTRIBUTE_NAME } from "@solid-devtools/shared/variables"
import { isWindows } from "@solid-primitives/platform"
import { ElementLocation } from "./goToSource"

export type SelectedComponent = {
  id: NodeID
  rootId: NodeID
  name: string
  element: HTMLElement
  location: ElementLocation | null
}

const LOC_ATTR_REGEX_WIN = /^((?:[^\\/:*?"<>|]+\\)*[^\\/:*?"<>|]+):([0-9]+):([0-9]+)$/
const LOC_ATTR_REGEX_UNIX = /^((?:[^\\:*?"<>|]+\/)*[^\\/:*?"<>|]+):([0-9]+):([0-9]+)$/

const LOC_ATTR_REGEX = isWindows ? LOC_ATTR_REGEX_WIN : LOC_ATTR_REGEX_UNIX

export function getLocationFromAttribute(value: string): ElementLocation | null {
  const match = value.match(LOC_ATTR_REGEX)
  if (!match) return null
  const [, filePath, line, column] = match
  return { filePath, line: +line, column: +column }
}

export function getLocationFromElement(element: Element): ElementLocation | null {
  const locAttr = element.getAttribute(LOCATION_ATTRIBUTE_NAME)
  return locAttr ? getLocationFromAttribute(locAttr) : null
}

const findComponentCache = new Map<HTMLElement, SelectedComponent | null>()

// for comparison — clear cache when component list changes
let prevComponents: Mapped.Component[] = []

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
  comps: Mapped.Component[],
  target: HTMLElement,
): SelectedComponent | null {
  if (prevComponents !== comps) {
    findComponentCache.clear()
    prevComponents = comps
  }

  const checked: HTMLElement[] = []
  const toCheck = [target]
  let location: ElementLocation | null = null
  let element: HTMLElement | null = null

  for (const el of toCheck) {
    if (!location) {
      const loc = getLocationFromElement(el)
      if (loc) {
        location = loc
        element = el
      }
    }

    const cached = findComponentCache.get(el)
    if (cached !== undefined) {
      checked.forEach(cel => findComponentCache.set(cel, cached))
      return cached
        ? { ...cached, location: location ?? cached.location, element: element ?? cached.element }
        : null
    }

    for (let i = comps.length - 1; i >= 0; i--) {
      const comp = comps[i]
      const { element: resolved } = comp
      if ((Array.isArray(resolved) && resolved.some(e => e === el)) || el === resolved) {
        const obj = { ...comp, element: element ?? el, location }
        checked.forEach(cel => findComponentCache.set(cel, obj))
        return obj
      }
    }
    el.parentElement && toCheck.push(el.parentElement)
  }
  return null
}
