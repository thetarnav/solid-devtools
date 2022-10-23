import { Mapped, NodeID, NodeType } from '@solid-devtools/shared/graph'
import { ElementMap, encodeValue, ValueType } from '@solid-devtools/shared/serialize'
import { $PROXY, untrack } from 'solid-js'
import { DEV as STORE_DEV } from 'solid-js/store'
import { Solid, ValueUpdateListener } from './types'
import { observeValueUpdate, removeValueUpdateObserver } from './update'
import {
  getComponentRefreshNode,
  getDisplayName,
  getNodeName,
  getNodeType,
  isSolidComponent,
  isSolidComputation,
  isSolidMemo,
  isSolidStore,
  markNodeID,
  markNodesID,
  markOwnerName,
  markOwnerType,
} from './utils'

const DEV = STORE_DEV!

export type SignalUpdateHandler = (nodeId: NodeID, value: unknown) => void
export type SignalMap = Record<NodeID, Solid.Signal | Solid.Store>

// Globals set before collecting the owner details
let $elementMap!: ElementMap
let $signalMap!: SignalMap

const INSPECTOR = Symbol('inspector')

function mapSignalNode(
  node: Solid.Signal | Solid.Store,
  handler: SignalUpdateHandler,
): Mapped.Signal {
  const { value } = node
  const id = markNodeID(node)
  $signalMap[id] = node

  // Check if is a store
  if (isSolidStore(node)) {
    console.log('store', node)
    return {
      type: NodeType.Store,
      id,
      name: getDisplayName((value as any)[DEV.$NAME]),
      // value: encodeValue(value, false, $elementMap),
      value: { type: ValueType.Object, value: 0 },
      // TODO: top-level values can be observed too, it's the "_" property
      observers: [],
    }
  }

  observeValueUpdate(node, v => handler(id, v), INSPECTOR)

  return {
    type: getNodeType(node) as NodeType.Memo | NodeType.Signal,
    name: getNodeName(node),
    id,
    observers: markNodesID(node.observers),
    value: encodeValue(value, false, $elementMap),
  }
}

export function clearOwnerObservers(owner: Solid.Owner): void {
  if (isSolidComputation(owner)) {
    removeValueUpdateObserver(owner, INSPECTOR)
  }
  if (owner.sourceMap) {
    for (const node of Object.values(owner.sourceMap)) removeValueUpdateObserver(node, INSPECTOR)
  }
  if (owner.owned) {
    for (const node of owner.owned) removeValueUpdateObserver(node, INSPECTOR)
  }
}

export function encodeComponentProps(
  owner: Solid.Owner,
  config: { inspectedProps?: Set<string>; elementMap: ElementMap },
): Mapped.Props | null {
  if (!isSolidComponent(owner)) return null
  const { elementMap, inspectedProps } = config
  const { props } = owner
  const proxy = !!(props as any)[$PROXY]
  const record = Object.entries(Object.getOwnPropertyDescriptors(props)).reduce(
    (record, [key, descriptor]) => {
      record[key] =
        'get' in descriptor
          ? { type: ValueType.Getter, value: key }
          : encodeValue(
              descriptor.value,
              inspectedProps ? inspectedProps.has(key) : false,
              elementMap,
            )
      return record
    },
    {} as Mapped.Props['record'],
  )
  return { proxy, record }
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    onSignalUpdate: SignalUpdateHandler
    onValueUpdate: ValueUpdateListener
  },
): {
  details: Mapped.OwnerDetails
  signalMap: SignalMap
  elementMap: ElementMap
  getOwnerValue: () => unknown
} {
  const { onSignalUpdate, onValueUpdate } = config

  // Set globals
  $elementMap = new ElementMap()
  $signalMap = {}

  const type = markOwnerType(owner)
  let { sourceMap, owned } = owner
  let getValue = () => owner.value

  // handle context node specially
  if (type === NodeType.Context) {
    sourceMap = undefined
    owned = null
    const symbols = Object.getOwnPropertySymbols(owner.context)
    if (symbols.length !== 1) {
      console.warn('Context field has more than one symbol. This is not expected.')
      getValue = () => undefined
    } else {
      const contextValue = owner.context[symbols[0]]
      getValue = () => contextValue
    }
  }

  // marge component with refresh memo
  let refresh: Solid.Memo | null
  if (isSolidComponent(owner) && (refresh = getComponentRefreshNode(owner))) {
    sourceMap = refresh.sourceMap
    owned = refresh.owned
    getValue = () => refresh!.value
  }

  // map signals
  let signals: Mapped.Signal[]
  if (sourceMap) {
    const signalNodes = Object.values(sourceMap)
    signals = Array(signalNodes.length)
    for (let i = 0; i < signalNodes.length; i++) {
      signals[i] = mapSignalNode(signalNodes[i], onSignalUpdate)
    }
  } else signals = []

  // map memos
  if (owned) {
    for (const node of owned) {
      if (isSolidMemo(node)) signals.push(mapSignalNode(node, onSignalUpdate))
    }
  }

  const details: Mapped.OwnerDetails = {
    id: markNodeID(owner),
    name: markOwnerName(owner),
    type: markOwnerType(owner),
    signals,
  }

  if (isSolidComputation(owner)) {
    details.value = encodeValue(getValue(), false, $elementMap)
    observeValueUpdate(owner, onValueUpdate, INSPECTOR)
    details.sources = markNodesID(owner.sources)
    if (isSolidMemo(owner)) {
      details.observers = markNodesID(owner.observers)
    }
    // map component props
    const props = encodeComponentProps(owner, { elementMap: $elementMap })
    if (props) details.props = props
  }

  return { details, signalMap: $signalMap, elementMap: $elementMap, getOwnerValue: getValue }
}

function forEachStoreProp(
  node: Solid.StoreNode,
  fn: (key: string | number, node: Solid.StoreNode) => void,
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i]
      DEV.isWrappable(child) && fn(i, child)
    }
  } else {
    for (const key in node) {
      const { value, get } = Object.getOwnPropertyDescriptor(node, key)!
      if (!get && DEV.isWrappable(value)) fn(key, value)
    }
  }
}

export type StoreUpdateHandler = (data: {
  deleting: boolean
  path: PropertyKey[]
  property: PropertyKey
  value: unknown
}) => void

export function inspectStoreNode(
  rootNode: Solid.StoreNode,
  onUpdate: StoreUpdateHandler,
): VoidFunction {
  const set = new WeakSet<Solid.StoreNode>()
  const symbol = Symbol('inspect-store')

  return untrack(() => {
    trackStore(rootNode, [])

    return () => {
      untrackStore(rootNode)
    }
  })

  function trackStore(node: Solid.StoreNode, path: PropertyKey[]): void {
    console.log('> track', path.join('.') || '__root__')
    set.add(node)
    const handler: Solid.OnStoreNodeUpdate = ((property, value, deleting) =>
      untrack(() => {
        onUpdate({ deleting, path, property, value })
        const prev = node[property] as Solid.StoreNode | undefined
        if (DEV.isWrappable(prev)) untrackStore(prev)
        if (DEV.isWrappable(value)) trackStore(value as Solid.StoreNode, [...path, property])
      })) as Solid.OnStoreNodeUpdate
    handler.symbol = symbol
    node[DEV.$ON_UPDATE] = node[DEV.$ON_UPDATE] ? [...node[DEV.$ON_UPDATE]!, handler] : [handler]
    forEachStoreProp(node, (key, child) => !set.has(child) && trackStore(child, [...path, key]))
  }

  function untrackStore(node: Solid.StoreNode) {
    if (node[DEV.$ON_UPDATE]!.length === 1) delete node[DEV.$ON_UPDATE]
    else node[DEV.$ON_UPDATE] = node[DEV.$ON_UPDATE]!.filter(h => h.symbol !== symbol)
    set.delete(node)
    forEachStoreProp(node, (key, child) => set.has(child) && untrackStore(child))
  }
}
