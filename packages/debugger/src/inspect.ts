import { Mapped, NodeID, Solid, NodeType } from "@solid-devtools/shared/graph"
import { EncodedValue, encodeValue } from "@solid-devtools/shared/serialize"
import { $PROXY } from "solid-js"
import { observeValueUpdate, removeValueUpdateObserver } from "./update"
import {
  getNodeName,
  getNodeType,
  isSolidComponent,
  isSolidComputation,
  isSolidMemo,
  markNodeID,
  markNodesID,
} from "./utils"

export type SignalUpdateHandler = (nodeId: NodeID, value: unknown) => void

export type WalkerSelectedResult = (
  | { details: Mapped.OwnerDetails; owner: Solid.Owner }
  | { details: null; owner: null }
) & {
  signalMap: Record<NodeID, Solid.Signal>
  elementMap: Record<NodeID, HTMLElement>
}

// Globals set before collecting the owner details
let $elementMap!: Record<NodeID, HTMLElement>
let $signalMap!: Record<NodeID, Solid.Signal>

const INSPECTOR = Symbol("inspector")

function mapSignalNode(node: Solid.Signal, handler: SignalUpdateHandler): Mapped.Signal {
  const id = markNodeID(node)
  $signalMap[id] = node
  observeValueUpdate(node, value => handler(id, value), INSPECTOR)
  return {
    type: getNodeType(node) as NodeType.Memo | NodeType.Signal,
    name: getNodeName(node),
    id,
    observers: markNodesID(node.observers),
    value: encodeValue(node.value, false, $elementMap),
  }
}

export function clearOwnerObservers(owner: Solid.Owner): void {
  if (owner.sourceMap)
    Object.values(owner.sourceMap).forEach(node => removeValueUpdateObserver(node, INSPECTOR))
  if (owner.owned) owner.owned.forEach(node => removeValueUpdateObserver(node, INSPECTOR))
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    elementMap: Record<NodeID, HTMLElement>
    signalUpdateHandler: SignalUpdateHandler
  },
): {
  details: Mapped.OwnerDetails
  signalMap: Record<NodeID, Solid.Signal>
} {
  const { elementMap, signalUpdateHandler } = config
  const signalMap: Record<NodeID, Solid.Signal> = {}

  // Set globals
  $elementMap = elementMap
  $signalMap = signalMap

  // get owner path
  const path: NodeID[] = []
  let current: Solid.Owner | null = owner.owner
  while (current) {
    // * after we flatten the tree, we'll know the length of the path — no need to use unshift then
    path.unshift(markNodeID(current))
    current = current.owner
  }

  // map signals
  const signals = owner.sourceMap
    ? Object.values(owner.sourceMap).map(s => mapSignalNode(s, signalUpdateHandler))
    : []
  // map memos
  owner.owned?.forEach(child => {
    if (!isSolidMemo(child)) return
    signals.push(mapSignalNode(child, signalUpdateHandler))
  })

  const details: Mapped.OwnerDetails = {
    // id, name and type are already set in mapOwner
    id: owner.sdtId!,
    name: owner.sdtName!,
    type: owner.sdtType!,
    path,
    signals,
  }

  if (isSolidComputation(owner)) {
    details.value = encodeValue(owner.value, false, elementMap)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }
    if (isSolidComponent(owner)) {
      // map component props
      const { props } = owner
      const proxy = !!(props as any)[$PROXY]
      const value = Object.entries(Object.getOwnPropertyDescriptors(props)).reduce(
        (value, [key, descriptor]) => {
          value[key] = {
            signal: proxy || "get" in descriptor,
            value: encodeValue(descriptor.get?.() ?? descriptor.value, false, elementMap),
          }
          return value
        },
        {} as Record<string, { signal: boolean; value: EncodedValue<false> }>,
      )
      details.props = { proxy, value }
    }
  }

  return {
    details,
    signalMap,
  }
}
