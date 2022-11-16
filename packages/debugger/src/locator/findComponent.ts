import {
  LocationAttr,
  LOCATION_ATTRIBUTE_NAME,
  WINDOW_PROJECTPATH_PROPERTY,
} from '@solid-devtools/transform/types'
import { isWindows } from '@solid-primitives/platform'
import { Mapped, NodeID } from '../types'

export type LocatorComponent = {
  id: NodeID
  rootId: NodeID
  name: string
  element: HTMLElement
  location?: LocationAttr | undefined
}

export type TargetIDE = 'vscode' | 'webstorm' | 'atom' | 'vscode-insiders'

export type SourceLocation = {
  filePath: string
  line: number
  column: number
}

export type SourceCodeData = SourceLocation & { projectPath: string; element: HTMLElement | string }

export type TargetURLFunction = (data: SourceCodeData) => string | void

const LOC_ATTR_REGEX_WIN = /^((?:\\?[^\s][^/\\:\"\?\*<>\|]+)+):([0-9]+):([0-9]+)$/
const LOC_ATTR_REGEX_UNIX =
  /^((?:(?:\.\/|\.\.\/|\/)?(?:\.?\w+\/)*)(?:\.?\w+\.?\w+)):([0-9]+):([0-9]+)$/

export const LOC_ATTR_REGEX = isWindows ? LOC_ATTR_REGEX_WIN : LOC_ATTR_REGEX_UNIX

export function getLocationAttr(element: Element): LocationAttr | undefined {
  const attr = element.getAttribute(LOCATION_ATTRIBUTE_NAME)
  if (!attr || !LOC_ATTR_REGEX.test(attr)) return
  return attr as LocationAttr
}

const targetIDEMap: Record<TargetIDE, (data: SourceCodeData) => string> = {
  vscode: ({ projectPath, filePath, line, column }) =>
    `vscode://file/${projectPath}/${filePath}:${line}:${column}`,
  'vscode-insiders': ({ projectPath, filePath, line, column }) =>
    `vscode-insiders://file/${projectPath}/${filePath}:${line}:${column}`,
  atom: ({ projectPath, filePath, line, column }) =>
    `atom://core/open/file?filename=${projectPath}/${filePath}&line=${line}&column=${column}`,
  webstorm: ({ projectPath, filePath, line, column }) =>
    `webstorm://open?file=${projectPath}/${filePath}&line=${line}&column=${column}`,
}

function getTargetURL(target: TargetIDE | TargetURLFunction, data: SourceCodeData): string | void {
  if (typeof target === 'function') return target(data)
  return targetIDEMap[target](data)
}

export function getSourceCodeData(
  location: LocationAttr,
  element: HTMLElement | string,
): SourceCodeData | undefined {
  const projectPath: string | undefined = (window as any)[WINDOW_PROJECTPATH_PROPERTY]
  if (!projectPath) return
  const match = location.match(LOC_ATTR_REGEX)
  if (!match) return
  const [, filePath, line, column] = match
  return { filePath, line: +line, column: +column, projectPath, element }
}

export function getLocationFromAttribute(location: LocationAttr): SourceLocation | undefined {
  const match = location.match(LOC_ATTR_REGEX)
  if (!match) return
  const [, filePath, line, column] = match
  return { filePath, line: +line, column: +column }
}

export function openSourceCode(target: TargetIDE | TargetURLFunction, data: SourceCodeData): void {
  const url = getTargetURL(target, data)
  if (typeof url === 'string') window.open(url, '_blank')
}

const findComponentCache = new Map<HTMLElement, LocatorComponent | null>()

// for comparison — clear cache when component map changes
let prevCompMap: Record<NodeID, Mapped.ResolvedComponent[]> = {}

/**
 * Given an array of components and a HTML Element, find the closest component that contains the element.
 *
 * All the finds are stored in a cache to avoid re-computation. To clear the cache, use `clearFindComponentCache()`.
 *
 * @param compMap An array of MappedComponents
 * @param target HTMLElement to find the component for
 * @returns A SelectedComponent or null if no component was found. Selected component contains also a source code location property.
 */
export function findLocatorComponent(
  compMap: Record<NodeID, Mapped.ResolvedComponent[]>,
  target: HTMLElement,
): LocatorComponent | null {
  if (prevCompMap !== compMap) {
    findComponentCache.clear()
    prevCompMap = compMap
  }

  const checked: HTMLElement[] = []
  const toCheck = [target]
  let location: LocationAttr | undefined
  let element: HTMLElement | undefined

  for (const el of toCheck) {
    if (!location) {
      const loc = getLocationAttr(el)
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

    checked.push(el)

    for (const [rootId, comps] of Object.entries(compMap)) {
      for (let i = comps.length - 1; i >= 0; i--) {
        const comp = comps[i]
        const { element: resolved } = comp
        if ((Array.isArray(resolved) && resolved.some(e => e === el)) || el === resolved) {
          const obj = { ...comp, element: element ?? el, location, rootId }
          checked.forEach(cel => findComponentCache.set(cel, obj))
          return obj
        }
      }
    }

    el.parentElement && toCheck.push(el.parentElement)
  }
  return null
}
