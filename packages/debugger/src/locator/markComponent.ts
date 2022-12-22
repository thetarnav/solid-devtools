import { getOwner, getOwnerType } from '../main/utils'
import { NodeType, Solid } from '../types'
import { LocationAttr } from './findComponent'

export function markComponentLoc(location: LocationAttr): void {
  let owner = getOwner()
  if (!owner) return
  const type = getOwnerType(owner)
  if (type === NodeType.Component) (owner as Solid.Component).location = location
  else if (type === NodeType.Refresh) (owner.owner as Solid.Component).location = location
}
