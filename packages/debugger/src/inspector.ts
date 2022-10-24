import { $PROXY, Accessor, createEffect, untrack } from 'solid-js'
import { DEV as STORE_DEV } from 'solid-js/store'
import { throttle } from '@solid-primitives/scheduled'
import { Mapped, NodeID, NodeType, EncodedValue, ValueType } from '@solid-devtools/shared/graph'
import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { pushToArrayProp } from '@solid-devtools/shared/utils'
import { DebuggerEventHub } from './plugin'
import { walkSolidRoot } from './roots'
import { Core, Solid, ValueUpdateListener } from './types'
import { makeSolidUpdateListener, observeValueUpdate, removeValueUpdateObserver } from './update'
import {
  createBatchedUpdateEmitter,
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
import { ElementMap, encodeValue } from './serialize'

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
    return {
      type: NodeType.Store,
      id,
      name: getDisplayName((value as any)[DEV.$NAME]),
      value: encodeValue(value, false, $elementMap),
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
    return () => untrackStore(rootNode)
  })

  function trackStore(node: Solid.StoreNode, path: PropertyKey[]): void {
    set.add(node)
    const handler: Solid.OnStoreNodeUpdate = ((_, property, value, deleting) =>
      untrack(() => {
        onUpdate({ deleting, path, property, value })
        const prev = node[property] as Solid.StoreNode | Core.Store.NotWrappable
        // deleting not existing properties will fire an update as well
        if (deleting && !prev) return
        if (DEV.isWrappable(prev)) untrackStore(prev)
        if (DEV.isWrappable(value)) trackStore(value as Solid.StoreNode, [...path, property])
      })) as Solid.OnStoreNodeUpdate
    handler.symbol = symbol
    pushToArrayProp(node, DEV.$ON_UPDATE, handler)
    forEachStoreProp(node, (key, child) => !set.has(child) && trackStore(child, [...path, key]))
  }

  function untrackStore(node: Solid.StoreNode) {
    if (node[DEV.$ON_UPDATE]!.length === 1) delete node[DEV.$ON_UPDATE]
    else node[DEV.$ON_UPDATE] = node[DEV.$ON_UPDATE]!.filter(h => h.symbol !== symbol)
    set.delete(node)
    forEachStoreProp(node, (_, child) => set.has(child) && untrackStore(child))
  }
}

/**
 * Plugin module
 */
export function createInspector({
  debuggerEnabled,
  eventHub,
}: {
  debuggerEnabled: Accessor<boolean>
  eventHub: DebuggerEventHub
}) {
  const inspected = {
    elementMap: new ElementMap(),
    signalMap: {} as SignalMap,
    owner: null as Solid.Owner | null,
    signals: new Set<NodeID>(),
    props: new Set<string>(),
    value: false,
    getValue: () => null as unknown,
  }

  const getElementById = (id: NodeID): HTMLElement | undefined => inspected.elementMap.get(id)

  const pushSignalUpdate = createBatchedUpdateEmitter<{
    id: NodeID
    value: EncodedValue<boolean>
  }>(updates => eventHub.emit('SignalUpdates', updates))
  const onSignalUpdate: SignalUpdateHandler = untrackedCallback((id, value) => {
    if (!debuggerEnabled() || !inspected.owner) return
    const isSelected = inspected.signals.has(id)
    pushSignalUpdate({ id, value: encodeValue(value, isSelected, inspected.elementMap) })
  })

  const triggerValueUpdate = (() => {
    let updateNext = false
    const forceValueUpdate = () => {
      if (!debuggerEnabled() || !inspected.owner) return (updateNext = false)
      eventHub.emit('ValueUpdate', {
        value: encodeValue(inspected.getValue(), inspected.value, inspected.elementMap),
        update: updateNext,
      })
      updateNext = false
    }
    const triggerValueUpdate = throttle(forceValueUpdate)
    function handleValueUpdate(update: boolean, force = false) {
      if (update) updateNext = true
      if (force) forceValueUpdate()
      else triggerValueUpdate()
    }
    return handleValueUpdate
  })()

  const setInspectedDetails = untrackedCallback((owner: Solid.Owner) => {
    inspected.owner && clearOwnerObservers(inspected.owner)
    inspected.props.clear()
    inspected.signals.clear()
    inspected.owner = owner
    inspected.value = false
    const result = collectOwnerDetails(owner, {
      onSignalUpdate,
      onValueUpdate: () => triggerValueUpdate(true),
    })
    eventHub.emit('InspectedNodeDetails', result.details)
    inspected.signalMap = result.signalMap
    inspected.elementMap = result.elementMap
    inspected.getValue = result.getOwnerValue
  })
  const clearInspectedDetails = () => {
    inspected.owner && clearOwnerObservers(inspected.owner)
    inspected.owner = null
    inspected.signals.clear()
    inspected.props.clear()
    inspected.value = false
  }

  function updateInspectedProps() {
    if (!inspected.owner) return
    const props = encodeComponentProps(inspected.owner, {
      inspectedProps: inspected.props,
      elementMap: inspected.elementMap,
    })
    props && eventHub.emit('PropsUpdate', props)
  }

  createEffect(() => {
    // make sure we clear the owner observers when the plugin is disabled
    if (!debuggerEnabled()) inspected.owner && clearOwnerObservers(inspected.owner)
    // re-observe the owner when the plugin is enabled
    else inspected.owner && setInspectedDetails(inspected.owner)

    // update the owner details whenever there is a change in solid's internals
    makeSolidUpdateListener(
      throttle(() => {
        updateInspectedProps()
        triggerValueUpdate(false)
      }, 150),
    )
  })

  function setInspectedNode(data: { rootId: NodeID; nodeId: NodeID } | null) {
    if (!data) return clearInspectedDetails()
    const { rootId, nodeId } = data

    const walkResult = walkSolidRoot(rootId, nodeId)
    if (!walkResult || !walkResult.inspectedOwner) return clearInspectedDetails()

    setInspectedDetails(walkResult.inspectedOwner)
  }

  // TODO: this shouldn't return the value, but send ot though the event hub
  function setInspectedSignal(id: NodeID, selected: boolean): EncodedValue<boolean> | null {
    const signal = inspected.signalMap[id] as Solid.Signal | undefined
    if (!signal) return null
    if (selected) inspected.signals.add(id)
    else inspected.signals.delete(id)
    return untrack(() => encodeValue(signal.value, selected, inspected.elementMap))
  }
  function setInspectedProp(key: NodeID, selected: boolean) {
    if (selected) inspected.props.add(key)
    else inspected.props.delete(key)
    updateInspectedProps()
  }
  function setInspectedValue(selected: boolean) {
    if (!inspected.owner) return null
    inspected.value = selected
    triggerValueUpdate(false, true)
  }

  return {
    setInspectedNode,
    setInspectedSignal,
    setInspectedProp,
    setInspectedValue,
    getElementById,
  }
}
