import { isWindows } from '@solid-primitives/platform'
import { LOCATION_ATTRIBUTE_NAME, NodeID, WINDOW_PROJECTPATH_PROPERTY } from '../types'

export type LocationAttr = `${string}:${number}:${number}`

export type LocatorComponent = {
  id: NodeID
  name: string | undefined
  element: HTMLElement
  location?: LocationAttr | undefined
}

export type TargetIDE = 'vscode' | 'webstorm' | 'atom' | 'vscode-insiders'

export type SourceLocation = {
  filePath: string
  line: number
  column: number
}

export type SourceCodeData = SourceLocation & {
  projectPath: string
  element: HTMLElement | string | undefined
}

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
  element: SourceCodeData['element'],
): SourceCodeData | undefined {
  const projectPath: string | undefined = (window as any)[WINDOW_PROJECTPATH_PROPERTY]
  if (!projectPath) return
  const match = location.match(LOC_ATTR_REGEX)
  if (!match) return
  const [, filePath, line, column] = match
  if (!filePath || !line || !column) return
  return { filePath, line: +line, column: +column, projectPath, element }
}

export function getLocationFromAttribute(location: LocationAttr): SourceLocation | undefined {
  const match = location.match(LOC_ATTR_REGEX)
  if (!match) return
  const [, filePath, line, column] = match
  if (!filePath || !line || !column) return
  return { filePath, line: +line, column: +column }
}

export function openSourceCode(target: TargetIDE | TargetURLFunction, data: SourceCodeData): void {
  const url = getTargetURL(target, data)
  if (typeof url === 'string') window.open(url, '_blank')
}
