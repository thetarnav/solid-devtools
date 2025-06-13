import type {KbdKey} from '@solid-primitives/keyboard'
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
    node:    {id: NodeID}
    element: {id: NodeID}
}> | null

// used by the transform
export const WINDOW_PROJECTPATH_PROPERTY = '$sdt_projectPath'
export const LOCATION_ATTRIBUTE_NAME     = 'data-source-loc'

export type LocationAttr = `${string}:${number}:${number}`

export type TargetIDE = 'vscode' | 'webstorm' | 'atom' | 'vscode-insiders'

export type SourceCodeData = SourceLocation & {
    projectPath: string
}

export type TargetURLFunction = (data: SourceCodeData) => string | void

const LOC_ATTR_REGEX_WIN  = /^((?:\\?[^\s][^/\\:\"\?\*<>\|]+)+):([0-9]+):([0-9]+)$/
const LOC_ATTR_REGEX_UNIX = /^((?:(?:\.\/|\.\.\/|\/)?(?:\.?\w+\/)*)(?:\.?\w+\.?\w+)):([0-9]+):([0-9]+)$/

export function getLocationAttr(element: Element): LocationAttr | null {

    let attr = element.getAttribute(LOCATION_ATTRIBUTE_NAME)
    if (!attr) return null

    let is_windows = /(win32|win64|windows|wince)/i.test(navigator.userAgent)
    let regex = is_windows ? LOC_ATTR_REGEX_WIN : LOC_ATTR_REGEX_UNIX
    return regex.test(attr) ? attr as LocationAttr : null
}

function getTargetURL(target: TargetIDE | TargetURLFunction, data: SourceCodeData): string | void {

    if (typeof target === 'function') return target(data)

    let {projectPath, file, line, column} = data
    switch (target) {
    case 'vscode':          return `vscode://file/${projectPath}/${file}:${line}:${column}`
    case 'vscode-insiders': return `vscode-insiders://file/${projectPath}/${file}:${line}:${column}`
    case 'atom':            return `atom://core/open/file?filename=${projectPath}/${file}&line=${line}&column=${column}`
    case 'webstorm':        return `webstorm://open?file=${projectPath}/${file}&line=${line}&column=${column}`
    }
}

export const getProjectPath = (): string | undefined => (window as any)[WINDOW_PROJECTPATH_PROPERTY]

export function getSourceCodeData(location: SourceLocation): SourceCodeData | undefined {

    let project_path = getProjectPath()
    if (project_path == null) return

    return {...location, projectPath: project_path}
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
