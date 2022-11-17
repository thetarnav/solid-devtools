import { getOwner, getOwnerType } from '../main/utils'
import { LocationAttr, MARK_COMPONENT_FN_NAME } from '@solid-devtools/transform/types'
import { NodeType, Solid } from '../types'

export function markComponentLoc(location: LocationAttr): void {
  let owner = getOwner()
  if (!owner) return
  const type = getOwnerType(owner)
  if (type === NodeType.Component) (owner as Solid.Component).location = location
  else if (type === NodeType.Refresh) (owner.owner as Solid.Component).location = location
}

// transform uses this global function to mark components
;(globalThis as any)[MARK_COMPONENT_FN_NAME] = markComponentLoc
