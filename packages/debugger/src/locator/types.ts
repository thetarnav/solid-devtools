import type {ToDyscriminatedUnion} from '@solid-devtools/shared/utils'
import type {KbdKey} from '@solid-primitives/keyboard'
import type {NodeID} from '../main/types.ts'
import type {TargetIDE, TargetURLFunction} from './find-components.ts'

export type {
    LocationAttr,
    LocatorComponent,
    SourceLocation,
    TargetIDE,
    TargetURLFunction,
} from './find-components.ts'

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
