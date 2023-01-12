import type { ToDyscriminatedUnion } from '@solid-devtools/shared/utils'
import type { KbdKey } from '@solid-primitives/keyboard'
import type { NodeID } from '../main/types'
import type {
  LocatorComponent,
  SourceCodeData,
  TargetIDE,
  TargetURLFunction,
} from './findComponent'

export type { LocationAttr, LocatorComponent, TargetIDE, TargetURLFunction } from './findComponent'

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
  node: { id: NodeID }
  element: { id: NodeID }
}> | null

export type ClickMiddleware = (
  event: MouseEvent | CustomEvent,
  component: LocatorComponent,
  data: SourceCodeData | undefined,
) => void

// used by the transform
export const WINDOW_PROJECTPATH_PROPERTY = '$sdt_projectPath'
export const LOCATION_ATTRIBUTE_NAME = 'data-source-loc'
export const MARK_COMPONENT = `markComponentLoc`
export const USE_LOCATOR = `useLocator`
