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
  file: string
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
  vscode: ({ projectPath, file, line, column }) =>
    `vscode://file/${projectPath}/${file}:${line}:${column}`,
  'vscode-insiders': ({ projectPath, file: filePath, line, column }) =>
    `vscode-insiders://file/${projectPath}/${filePath}:${line}:${column}`,
  atom: ({ projectPath, file: filePath, line, column }) =>
    `atom://core/open/file?filename=${projectPath}/${filePath}&line=${line}&column=${column}`,
  webstorm: ({ projectPath, file: filePath, line, column }) =>
    `webstorm://open?file=${projectPath}/${filePath}&line=${line}&column=${column}`,
}

function getTargetURL(target: TargetIDE | TargetURLFunction, data: SourceCodeData): string | void {
  if (typeof target === 'function') return target(data)
  return targetIDEMap[target](data)
}

export const getProjectPath = (): string | undefined => (window as any)[WINDOW_PROJECTPATH_PROPERTY]

export function getSourceCodeData(
  location: LocationAttr,
  element: SourceCodeData['element'],
): SourceCodeData | undefined {
  const projectPath: string | undefined = getProjectPath()
  if (!projectPath) return
  const parsed = parseLocationString(location)
  if (!parsed) return
  return { ...parsed, projectPath, element }
}

/**
 * Validates and parses a location string to a {@link SourceLocation} object
 */
export function parseLocationString(location: string): SourceLocation | undefined {
  // eslint-disable-next-line prefer-const
  let [filePath, line, column] = location.split(':') as [string, string | number, string | number]
  if (
    filePath &&
    line &&
    column &&
    typeof filePath === 'string' &&
    !isNaN((line = Number(line))) &&
    !isNaN((column = Number(column)))
  ) {
    return { file: filePath, line, column }
  }
}

export function openSourceCode(target: TargetIDE | TargetURLFunction, data: SourceCodeData): void {
  const url = getTargetURL(target, data)
  if (typeof url === 'string') window.open(url, '_blank')
}
