import type {KbdKey} from '@solid-primitives/keyboard'
import {isWindows} from '@solid-primitives/platform'
import type {ToDyscriminatedUnion} from '@solid-devtools/shared/utils'
import {type NodeID, type SourceLocation} from '../main/types.ts'

export type LocatorOptions = {
    /** Choose in which IDE the component source code should be revealed. */
    targetIDE?: false | TargetIDE | TargetURLFunction
    /**
     * Holding which key should enable the locator overlay?
     * @default 'Alt'
     */
    key?: false | KbdKey
}

export type HighlightElementPayload = ToDyscriminatedUnion<{
    node: {id: NodeID}
    element: {id: NodeID}
}> | null

// used by the transform
export const WINDOW_PROJECTPATH_PROPERTY = '$sdt_projectPath'
export const LOCATION_ATTRIBUTE_NAME = 'data-source-loc'

export type LocationAttr = `${string}:${number}:${number}`

export type TargetIDE = 'vscode' | 'webstorm' | 'atom' | 'vscode-insiders'

export type SourceCodeData = SourceLocation & {
    projectPath: string
    element: HTMLElement | string | undefined
}

export type TargetURLFunction = (data: SourceCodeData) => string | void

const LOC_ATTR_REGEX_WIN = /^((?:\\?[^\s][^/\\:\"\?\*<>\|]+)+):([0-9]+):([0-9]+)$/
const LOC_ATTR_REGEX_UNIX =
    /^((?:(?:\.\/|\.\.\/|\/)?(?:\.?\w+\/)*)(?:\.?\w+\.?\w+)):([0-9]+):([0-9]+)$/

export const LOC_ATTR_REGEX = isWindows ? LOC_ATTR_REGEX_WIN : LOC_ATTR_REGEX_UNIX

export function getLocationAttr(element: Element): LocationAttr | null {
    let attr = element.getAttribute(LOCATION_ATTRIBUTE_NAME)
    if (!attr || !LOC_ATTR_REGEX.test(attr)) return null
    return attr as LocationAttr
}

const targetIDEMap: Record<TargetIDE, (data: SourceCodeData) => string> = {
    vscode: ({projectPath, file, line, column}) =>
        `vscode://file/${projectPath}/${file}:${line}:${column}`,
    'vscode-insiders': ({projectPath, file: filePath, line, column}) =>
        `vscode-insiders://file/${projectPath}/${filePath}:${line}:${column}`,
    atom: ({projectPath, file: filePath, line, column}) =>
        `atom://core/open/file?filename=${projectPath}/${filePath}&line=${line}&column=${column}`,
    webstorm: ({projectPath, file: filePath, line, column}) =>
        `webstorm://open?file=${projectPath}/${filePath}&line=${line}&column=${column}`,
}

function getTargetURL(target: TargetIDE | TargetURLFunction, data: SourceCodeData): string | void {
    if (typeof target === 'function') return target(data)
    return targetIDEMap[target](data)
}

export const getProjectPath = (): string | undefined => (window as any)[WINDOW_PROJECTPATH_PROPERTY]

export function getSourceCodeData(
    location: SourceLocation,
    element: SourceCodeData['element'],
): SourceCodeData | undefined {

    let projectPath: string | undefined = getProjectPath()
    if (projectPath == null) return

    return {...location, projectPath, element}
}

/**
 * Validates and parses a location string to a {@link SourceLocation} object
 */
export function parseLocationString(location: string): SourceLocation | undefined {
    let [file, line, column] = location.split(':') as [string, string | number, string | number]
    if (
        file && line && column &&
        typeof file === 'string' &&
        !isNaN((line   = +line)) &&
        !isNaN((column = +column))
    ) {
        return {file, line, column}
    }
}

export function openSourceCode(target: TargetIDE | TargetURLFunction, data: SourceCodeData): void {
    const url = getTargetURL(target, data)
    if (typeof url === 'string') window.open(url, '_blank')
}
