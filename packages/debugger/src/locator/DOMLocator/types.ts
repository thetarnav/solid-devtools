import type {KbdKey} from '@solid-primitives/keyboard'
import type {TargetIDE, TargetURLFunction} from './find-components'

export type {LocationAttr, LocatorComponent, TargetIDE, TargetURLFunction} from './find-components'

export type LocatorOptions = {
    /** Choose in which IDE the component source code should be revealed. */
    targetIDE?: false | TargetIDE | TargetURLFunction
    /**
     * Holding which key should enable the locator overlay?
     * @default 'Alt'
     */
    key?: false | KbdKey
}

// used by the transform
export const WINDOW_PROJECTPATH_PROPERTY = '$sdt_projectPath'
export const LOCATION_ATTRIBUTE_NAME = 'data-source-loc'
