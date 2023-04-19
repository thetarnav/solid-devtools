import { untrackedCallback } from '@solid-devtools/shared/primitives'
import { isRecord } from '@solid-devtools/shared/utils'
import { NodeType, ValueItemType } from '../main/constants'
import { ObjectType, getSdtId } from '../main/id'
import { observeValueUpdate, removeValueUpdateObserver } from '../main/observe'
import SolidAPI from '../main/solid-api'
import type { Mapped, NodeID, Solid, ValueItemID } from '../main/types'
import {
  getComponentRefreshNode,
  getNodeName,
  isSolidComponent,
  isSolidComputation,
  isSolidMemo,
  isSolidSignal,
  isSolidStore,
  markOwnerName,
  markOwnerType,
} from '../main/utils'
import { encodeValue } from './serialize'
import { InspectorUpdateMap, PropGetterState } from './types'

export class ValueNode {
  private trackedStores: VoidFunction[] = []
  private selected = false
  constructor(public getValue: (() => unknown) | undefined) {}
  addStoreObserver(unsub: VoidFunction) {
    this.trackedStores.push(unsub)
  }
  private unsubscribe() {
    for (const unsub of this.trackedStores) unsub()
    this.trackedStores = []
  }
  reset() {
    this.unsubscribe()
    this.selected = false
  }
  isSelected() {
    return this.selected
  }
  setSelected(selected: boolean) {
    this.selected = selected
    if (!selected) this.unsubscribe()
  }
}

export class ValueNodeMap {
  private record = {} as Record<ValueItemID, ValueNode>
  get(id: ValueItemID): ValueNode | undefined {
    return this.record[id]
  }
  add(id: ValueItemID, getValue: (() => unknown) | undefined) {
    this.record[id] = new ValueNode(getValue)
  }
  reset() {
    for (const signal of Object.values(this.record)) signal.reset()
  }
}

export namespace Inspector {
  /** Prop becomes stale or live (is being currently listened to reactively or not) */
  export type OnPropStateChange = (key: string, state: PropGetterState) => void
  export type OnValueUpdate = (id: ValueItemID) => void
}

export type ObservedPropsMap = WeakMap<Solid.Component['props'], ObservedProps>

const $NOT_SET = Symbol('not-set')

/**
 * Manages observing getter properties.
 * This is used to track when a prop is accessed and when it is no longer accessed. (STALE | LIVE)
 */
export class ObservedProps {
  constructor(readonly props: Solid.Component['props']) {}

  private onPropStateChange?: Inspector.OnPropStateChange | undefined
  private onValueUpdate?: Inspector.OnValueUpdate | undefined
  private observedGetters = {} as Record<string, { v: unknown | typeof $NOT_SET; n: number }>

  observe(onPropStateChange: Inspector.OnPropStateChange, onValueUpdate: Inspector.OnValueUpdate) {
    this.onPropStateChange = onPropStateChange
    this.onValueUpdate = onValueUpdate
  }
  unobserve() {
    this.onPropStateChange = undefined
    this.onValueUpdate = undefined
  }

  observeProp(
    key: string,
    id: ValueItemID,
    get: () => unknown,
  ): { getValue: () => unknown | typeof $NOT_SET; isStale: boolean } {
    if (this.observedGetters[key]) {
      const o = this.observedGetters[key]!
      return { getValue: () => o.v, isStale: o.n === 0 }
    }

    const self = this
    const o: (typeof this.observedGetters)[string] = (this.observedGetters[key] = {
      v: $NOT_SET,
      n: 0,
    })

    // monkey patch the getter to track when it is accessed and when it is no longer accessed.
    // and to track when the value changes.
    Object.defineProperty(this.props, key, {
      get() {
        const value = get()
        if (SolidAPI.getListener()) {
          SolidAPI.onCleanup(
            () => --o.n === 0 && self.onPropStateChange?.(key, PropGetterState.Stale),
          )
        }
        ++o.n === 1 && self.onPropStateChange?.(key, PropGetterState.Live)
        if (value !== o.v) self.onValueUpdate?.(id)
        return (o.v = value)
      },
      enumerable: true,
    })

    return { getValue: () => o.v, isStale: true }
  }
}

const compareProxyPropKeys = (
  oldKeys: readonly string[],
  newKeys: readonly string[],
): InspectorUpdateMap['propKeys'] | null => {
  const added = new Set(newKeys)
  const removed: string[] = []
  let changed = false
  for (const key of oldKeys) {
    if (added.has(key)) added.delete(key)
    else {
      changed = true
      removed.push(key)
    }
  }
  if (!changed && !added.size) return null
  return { added: Array.from(added), removed }
}

/**
 * Clear all observers from inspected owner. (value updates, prop updates, etc.)
 * Used to clear observers when the inspected owner is switched.
 */
export function clearOwnerObservers(owner: Solid.Owner, observedPropsMap: ObservedPropsMap): void {
  if (isSolidComputation(owner)) {
    removeValueUpdateObserver(owner, $INSPECTOR)

    if (isSolidComponent(owner)) {
      observedPropsMap.get(owner.props)?.unobserve()
    }
  }
  if (owner.sourceMap) {
    for (const node of Object.values(owner.sourceMap)) removeValueUpdateObserver(node, $INSPECTOR)
  }
  if (owner.owned) {
    for (const node of owner.owned) removeValueUpdateObserver(node, $INSPECTOR)
  }
}

// Globals set before collecting the owner details
let ValueMap!: ValueNodeMap
let OnValueUpdate: Inspector.OnValueUpdate
let OnPropStateChange: Inspector.OnPropStateChange
let PropsMap: ObservedPropsMap

const $INSPECTOR = Symbol('inspector')

const typeToObjectTypeMap = {
  [NodeType.Signal]: ObjectType.Signal,
  [NodeType.Memo]: ObjectType.Owner,
  [NodeType.Store]: ObjectType.Store,
}

function mapSourceValue(
  node: Solid.SourceMapValue | Solid.Memo | Solid.Store,
  handler: (nodeId: NodeID, value: unknown) => void,
  isMemo: boolean,
): Mapped.Signal | null {
  const type = isMemo
    ? NodeType.Memo
    : isSolidStore(node)
    ? NodeType.Store
    : isSolidSignal(node)
    ? NodeType.Signal
    : null

  if (!type) return null

  const { value } = node,
    id = getSdtId(node, typeToObjectTypeMap[type])

  ValueMap.add(`${ValueItemType.Signal}:${id}`, () => node.value)

  if (type !== NodeType.Store) observeValueUpdate(node, v => handler(id, v), $INSPECTOR)

  return {
    type,
    name: getNodeName(node),
    id,
    value: encodeValue(value, false),
  }
}

function mapProps(props: Solid.Component['props']) {
  // proxy props need to be checked for changes in keys
  const isProxy = !!(props as any)[SolidAPI.$PROXY]
  const record: Mapped.Props['record'] = {}

  let checkProxyProps: (() => ReturnType<typeof compareProxyPropKeys>) | undefined

  // PROXY PROPS
  if (isProxy) {
    let propsKeys = Object.keys(props)

    for (const key of propsKeys) record[key] = { getter: PropGetterState.Stale, value: null }

    checkProxyProps = () => {
      const _oldKeys = propsKeys
      return compareProxyPropKeys(_oldKeys, (propsKeys = Object.keys(props)))
    }
  }
  // STATIC SHAPE
  else {
    let observed = PropsMap.get(props)
    if (!observed) PropsMap.set(props, (observed = new ObservedProps(props)))

    observed.observe(OnPropStateChange, OnValueUpdate)

    for (const [key, desc] of Object.entries(Object.getOwnPropertyDescriptors(props))) {
      const id: ValueItemID = `prop:${key}`
      // GETTER
      if (desc.get) {
        const { getValue, isStale } = observed.observeProp(key, id, desc.get)
        ValueMap.add(id, getValue)
        const lastValue = getValue()
        record[key] = {
          getter: isStale ? PropGetterState.Stale : PropGetterState.Live,
          value: lastValue !== $NOT_SET ? encodeValue(getValue(), false) : null,
        }
      }
      // VALUE
      else {
        record[key] = {
          getter: false,
          value: encodeValue(desc.value, false),
        }
        // non-object props cannot be inspected (won't ever change and aren't deep)
        if (Array.isArray(desc.value) || isRecord(desc.value)) ValueMap.add(id, () => desc.value)
      }
    }
  }

  return { props: { proxy: isProxy, record }, checkProxyProps }
}

export const collectOwnerDetails = /*#__PURE__*/ untrackedCallback(function (
  owner: Solid.Owner,
  config: {
    onPropStateChange: Inspector.OnPropStateChange
    onValueUpdate: Inspector.OnValueUpdate
    observedPropsMap: ObservedPropsMap
  },
) {
  const { onValueUpdate } = config

  // Set globals
  ValueMap = new ValueNodeMap()
  OnValueUpdate = onValueUpdate
  OnPropStateChange = config.onPropStateChange
  PropsMap = config.observedPropsMap

  const id = getSdtId(owner, ObjectType.Owner)
  const type = markOwnerType(owner)
  const name = markOwnerName(owner)
  let { sourceMap, owned } = owner
  let getValue = () => owner.value

  const details = { id, name, type, signals: [] } as Mapped.OwnerDetails

  // handle context node specially
  if (type === NodeType.Context) {
    sourceMap = undefined
    owned = null
    const symbols = Object.getOwnPropertySymbols(owner.context)
    if (symbols.length !== 1) {
      throw new Error('Context field has more than one symbol. This is not expected.')
    } else {
      const contextValue = owner.context[symbols[0]!]
      getValue = () => contextValue
    }
  }

  let checkProxyProps: ReturnType<typeof mapProps>['checkProxyProps']

  if (isSolidComputation(owner)) {
    // handle Component (props and location)
    if (isSolidComponent(owner)) {
      // marge component with refresh memo
      const refresh = getComponentRefreshNode(owner)
      if (refresh) {
        sourceMap = refresh.sourceMap
        owned = refresh.owned
        getValue = () => refresh.value
      }

      ;({ checkProxyProps, props: details.props } = mapProps(owner.props))
      // TODO: location
      // if (owner.location) details.location = owner.location
    } else {
      observeValueUpdate(owner, () => onValueUpdate(ValueItemType.Value), $INSPECTOR)
    }

    details.value = encodeValue(getValue(), false)
  }

  const onSignalUpdate = (signalId: NodeID) => onValueUpdate(`${ValueItemType.Signal}:${signalId}`)

  // map signals
  if (sourceMap) {
    for (const signal of sourceMap) {
      const mapped = mapSourceValue(signal, onSignalUpdate, false)
      mapped && details.signals.push(mapped)
    }
  }

  // map memos
  if (owned) {
    for (const node of owned) {
      if (!isSolidMemo(node)) continue
      const mapped = mapSourceValue(node, onSignalUpdate, true)
      mapped && details.signals.push(mapped)
    }
  }

  ValueMap.add(ValueItemType.Value, getValue)

  const result = {
    details,
    valueMap: ValueMap,
    checkProxyProps,
  }

  // clear globals
  ValueMap = OnValueUpdate = OnPropStateChange = PropsMap = undefined!

  return result
})
