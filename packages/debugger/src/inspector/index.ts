import { $PROXY, Accessor, createEffect, createMemo, untrack } from 'solid-js'
import { throttle } from '@solid-primitives/scheduled'
import { Mapped, NodeID, NodeType, EncodedValue, ValueType } from '@solid-devtools/shared/graph'
import { Messages } from '@solid-devtools/shared/bridge'
import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { DebuggerEventHub } from '../plugin'
import { walkSolidRoot } from '../roots'
import { Solid, ValueUpdateListener } from '../types'
import { makeSolidUpdateListener, observeValueUpdate, removeValueUpdateObserver } from '../update'
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
} from '../utils'
import { ElementMap, encodeValue, HandleStoreNode } from './serialize'
import { getStoreNodeName, observeStoreNode } from './store'

export type SignalUpdateHandler = (nodeId: NodeID, value: unknown) => void
export type SignalMap = Record<
  NodeID,
  {
    node: Solid.Signal | Solid.Store
    // unsub functions:
    trackedStores: VoidFunction[]
    selected: boolean
  }
>

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
  $signalMap[id] = { node, trackedStores: [], selected: false }

  // Check if is a store
  if (isSolidStore(node)) {
    return {
      type: NodeType.Store,
      id,
      name: getDisplayName(getStoreNodeName(value as Solid.StoreNode)),
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
  config: { inspected?: Set<string>; elementMap: ElementMap; handleStore: HandleStoreNode },
): Mapped.Props | null {
  if (!isSolidComponent(owner)) return null
  const { elementMap, inspected, handleStore } = config
  const { props } = owner
  const proxy = !!(props as any)[$PROXY]
  const record: Mapped.Props['record'] = {}
  for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
    record[key] = desc.get
      ? { type: ValueType.Getter, value: key }
      : encodeValue(desc.value, inspected ? inspected.has(key) : false, elementMap, handleStore)
  }
  return { proxy, record }
}

export function collectOwnerDetails(
  owner: Solid.Owner,
  config: {
    onSignalUpdate: SignalUpdateHandler
    onValueUpdate: ValueUpdateListener
    handleStoreNode: HandleStoreNode
  },
): {
  details: Mapped.OwnerDetails
  signalMap: SignalMap
  elementMap: ElementMap
  getOwnerValue: () => unknown
} {
  const { onSignalUpdate, onValueUpdate, handleStoreNode } = config

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
      throw new Error('Context field has more than one symbol. This is not expected.')
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
    const props = encodeComponentProps(owner, {
      elementMap: $elementMap,
      handleStore: handleStoreNode,
    })
    if (props) details.props = props
  }

  return { details, signalMap: $signalMap, elementMap: $elementMap, getOwnerValue: getValue }
}

export type InspectorUpdateData = {
  'set-signal': { id: NodeID; value: EncodedValue<boolean> }
  signals: { updates: { id: NodeID; value: EncodedValue<boolean> }[] }
  value: { value: EncodedValue<boolean>; update: boolean }
  props: { value: Mapped.Props }
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
    owner: null as Solid.Owner | null,
    props: new Set<string>(),
    value: false,
  }
  let getNodeValue = () => null as unknown
  let elementMap = new ElementMap()
  let signalMap = {} as SignalMap

  const enabled = createMemo(() => debuggerEnabled() || !!inspected.owner)

  const getElementById = (id: NodeID): HTMLElement | undefined => elementMap.get(id)

  const handleStoreNode: HandleStoreNode = node => {
    console.log('handleStoreNode', getStoreNodeName(node), '\n', node)
  }

  function emitUpdate<T extends keyof InspectorUpdateData>(type: T, data: InspectorUpdateData[T]) {
    eventHub.emit('InspectorUpdate', { type, ...data } as any)
  }

  const onSignalUpdate = (() => {
    const pushSignalUpdate = createBatchedUpdateEmitter<{
      id: NodeID
      value: EncodedValue<boolean>
    }>(updates => emitUpdate('signals', { updates }))

    return untrackedCallback<SignalUpdateHandler>((id, value) => {
      if (!enabled()) return
      const isSelected = signalMap[id]?.selected
      pushSignalUpdate({
        id,
        value: encodeValue(value, isSelected, elementMap, handleStoreNode),
      })
    })
  })()

  const triggerValueUpdate = (() => {
    let updateNext = false
    const forceValueUpdate = () => {
      if (!enabled()) return (updateNext = false)
      emitUpdate('value', {
        value: encodeValue(getNodeValue(), inspected.value, elementMap, handleStoreNode),
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
    inspected.owner = owner
    inspected.value = false
    const result = collectOwnerDetails(owner, {
      onSignalUpdate,
      onValueUpdate: () => triggerValueUpdate(true),
      handleStoreNode,
    })
    eventHub.emit('InspectedNodeDetails', result.details)
    signalMap = result.signalMap
    elementMap = result.elementMap
    getNodeValue = result.getOwnerValue
  })
  const clearInspectedDetails = () => {
    inspected.owner && clearOwnerObservers(inspected.owner)
    inspected.owner = null
    inspected.props.clear()
    inspected.value = false
  }

  function updateInspectedProps() {
    if (!inspected.owner) return
    const props = encodeComponentProps(inspected.owner, {
      inspected: inspected.props,
      elementMap: elementMap,
      handleStore: handleStoreNode,
    })
    props && emitUpdate('props', { value: props })
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

  function setInspectedSignal(id: NodeID, selected: boolean): void {
    const signal = signalMap[id]
    if (!signal) {
      console.warn('Could not find signal', id)
      return
    }
    signal.selected = selected
    const value = untrack(() =>
      encodeValue(signal.node.value, selected, elementMap, storeNode => {
        console.log('TRACK STORE NODE', getStoreNodeName(storeNode))
        const unsub = observeStoreNode(storeNode, data => {
          console.log('STORE NODE UPDATE', getStoreNodeName(storeNode), data)
        })
        signal.trackedStores.push(unsub)
      }),
    )
    emitUpdate('set-signal', { id, value })
  }
  function setInspectedProp(key: NodeID, selected: boolean): void {
    if (selected) inspected.props.add(key)
    else inspected.props.delete(key)
    updateInspectedProps()
  }
  function setInspectedValue(selected: boolean): void {
    if (!inspected.owner) return
    inspected.value = selected
    triggerValueUpdate(false, true)
  }

  function setInspected(payload: Messages['ToggleInspected']) {
    switch (payload.type) {
      case 'node':
        setInspectedNode(payload.data)
        break
      case 'signal':
        setInspectedSignal(payload.data.id, payload.data.selected)
        break
      case 'prop':
        setInspectedProp(payload.data.id, payload.data.selected)
        break
      case 'value':
        setInspectedValue(payload.data)
        break
    }
  }

  return {
    setInspectedNode,
    setInspectedSignal,
    setInspectedProp,
    setInspectedValue,
    setInspected,
    getElementById,
  }
}
