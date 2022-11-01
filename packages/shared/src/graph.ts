import { Many } from '@solid-primitives/utils'

export enum NodeType {
  Root,
  Component,
  Effect,
  Render,
  Memo,
  Computation,
  Refresh,
  Context,
  Signal,
  Store,
}

export type NodeID = string & {}

export type ValueNodeId = `signal:${NodeID}` | `prop:${string}` | `value`
export type ValueNodeType = 'signal' | 'prop' | 'value'

export const getValueNodeId = <T extends ValueNodeType>(
  type: T,
  id: T extends 'value' ? undefined : NodeID | string,
): ValueNodeId => {
  if (type === 'value') return 'value'
  return `${type}:${id}` as ValueNodeId
}

export const splitValueNodeId = (id: ValueNodeId) => {
  return id.split(':') as [ValueNodeType, undefined | NodeID | string]
}

export type ComputationUpdate = { rootId: NodeID; id: NodeID }

export type RootsUpdates = {
  removed: NodeID[]
  updated: Record<NodeID, Mapped.Root>
}

export type HighlightElementPayload =
  | { rootId: NodeID; nodeId: NodeID }
  | { elementId: string }
  | null

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export namespace Mapped {
  export interface Root {
    id: NodeID
    name?: undefined
    type: NodeType.Root
    children?: Owner[]
    // sub-roots will have an owner
    attached?: NodeID
  }

  export interface Owner {
    id: NodeID
    type: Exclude<NodeType, NodeType.Root | NodeType.Refresh>
    children?: Owner[]
    name?: string
    hmr?: boolean
    frozen?: true
  }

  export interface Signal {
    type: NodeType.Signal | NodeType.Memo | NodeType.Store
    name: string
    id: NodeID
    observers: NodeID[]
    value: EncodedValue<false>
  }

  export type ResolvedComponent = {
    id: NodeID
    name: string
    /**
     * ! HTMLElements aren't JSON serialisable
     */
    element: Many<HTMLElement>
  }

  export type Props = {
    proxy: boolean
    record: Record<string, EncodedValue<boolean>>
  }

  export interface OwnerDetails {
    id: NodeID
    name: string
    type: NodeType
    props?: Props
    signals: Signal[]
    /** for computations */
    value?: EncodedValue
    /** for computations */
    sources?: NodeID[]
    /** for memos */
    observers?: NodeID[]
  }
}

export const INFINITY = '__$sdt-Infinity__'
export const NEGATIVE_INFINITY = '__$sdt-NegativeInfinity__'
export const NAN = '__$sdt-NaN__'

export enum ValueType {
  Number,
  Boolean,
  String,
  Null,
  Undefined,
  Symbol,
  Array,
  Object,
  Function,
  Getter,
  Element,
  Instance,
  Store,
}

export type EncodedPreviewPayloadMap = {
  [ValueType.Array]: number
  [ValueType.Object]: number
  [ValueType.Number]: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
  [ValueType.Boolean]: boolean
  [ValueType.String]: string
  [ValueType.Symbol]: string
  [ValueType.Function]: string
  [ValueType.Getter]: string
  [ValueType.Element]: { name: string; id: NodeID }
  [ValueType.Instance]: string
  [ValueType.Store]: { value: EncodedValue<boolean>; id: NodeID }
}

export type EncodedPreviewChildrenMap = {
  [ValueType.Array]: EncodedValue<true>[]
  [ValueType.Object]: Record<string | number, EncodedValue<true>>
}

export type EncodedValueOf<K extends ValueType, Deep extends boolean = boolean> = {
  type: K
} & (K extends keyof EncodedPreviewPayloadMap
  ? { value: EncodedPreviewPayloadMap[K] }
  : { value?: undefined }) &
  (Deep extends true
    ? K extends keyof EncodedPreviewChildrenMap
      ? { children: EncodedPreviewChildrenMap[K] }
      : { children?: undefined }
    : { children?: undefined })

export type EncodedValue<Deep extends boolean = boolean> = {
  [K in ValueType]: EncodedValueOf<K, Deep>
}[ValueType]
