import { Mapped, NodeID, Solid, NodeType } from "@solid-devtools/shared/graph"
import { ElementMap, encodeValue, ValueType } from "@solid-devtools/shared/serialize"
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
  markOwnerName,
  markOwnerType,
} from "./utils"

export type SignalUpdateHandler = (nodeId: NodeID, value: unknown) => void

// Globals set before collecting the owner details
let $elementMap!: ElementMap
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
  if (owner.sourceMap) {
    for (const node of Object.values(owner.sourceMap)) removeValueUpdateObserver(node, INSPECTOR)
  }
  if (owner.owned) {
    for (const node of owner.owned) removeValueUpdateObserver(node, INSPECTOR)
  }
}

export function encodeComponentProps(
  owner: Solid.Owner,
  config: { inspectedProps: Set<string>; elementMap: ElementMap },
): Mapped.Props | null {
  if (!isSolidComponent(owner)) return null
  const { elementMap, inspectedProps } = config
  const { props } = owner
  const proxy = !!(props as any)[$PROXY]
  const record = Object.entries(Object.getOwnPropertyDescriptors(props)).reduce(
    (record, [key, descriptor]) => {
      record[key] =
        "get" in descriptor
          ? { type: ValueType.Getter, value: key }
          : encodeValue(descriptor.value, inspectedProps.has(key), elementMap)
      return record
    },
    {} as Mapped.Props["record"],
  )
  return { proxy, record }
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    inspectedProps: Set<string>
    elementMap: ElementMap
    signalUpdateHandler: SignalUpdateHandler
  },
): {
  details: Mapped.OwnerDetails
  signalMap: Record<NodeID, Solid.Signal>
} {
  const { elementMap, signalUpdateHandler, inspectedProps } = config
  const signalMap: Record<NodeID, Solid.Signal> = {}

  // Set globals
  $elementMap = elementMap
  $signalMap = signalMap

  let { sourceMap, owned } = owner
  let refresh: Solid.Owner | undefined
  if (owned && owned.length === 1 && markOwnerType((refresh = owned[0])) === NodeType.Refresh) {
    // if omitting refresh node — map it's sourceMap and owned instead
    sourceMap = refresh.sourceMap
    owned = refresh.owned
  }

  // map signals
  let signals: Mapped.Signal[]
  if (sourceMap) {
    const signalNodes = Object.values(sourceMap)
    signals = Array(signalNodes.length)
    for (let i = 0; i < signalNodes.length; i++) {
      signals[i] = mapSignalNode(signalNodes[i], signalUpdateHandler)
    }
  } else signals = []

  // map memos
  if (owned) {
    for (const node of owned) {
      if (isSolidMemo(node)) signals.push(mapSignalNode(node, signalUpdateHandler))
    }
  }

  const details: Mapped.OwnerDetails = {
    id: markNodeID(owner),
    name: markOwnerName(owner),
    type: markOwnerType(owner),
    signals,
  }

  if (isSolidComputation(owner)) {
    details.value = encodeValue(owner.value, false, elementMap)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }
    // map component props
    const props = encodeComponentProps(owner, { inspectedProps, elementMap })
    if (props) details.props = props
  }

  return { details, signalMap }
}
