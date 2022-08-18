import { getOwner as _getOwner } from "solid-js"
import { Many } from "@solid-primitives/utils"
import { Owner as _Owner, SignalState as _SignalState, Computation as _Computation } from "./solid"
import { INTERNAL, NOTFOUND } from "./variables"
import { EncodedValue } from "./serialize"
import { Merge } from "type-fest"

export enum NodeType {
  Component,
  Effect,
  Render,
  Memo,
  Computation,
  Refresh,
  Signal,
  Root,
}

export type NodeID = string & {}

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

declare module "solid-js/types/reactive/signal" {
  interface SignalState<T> {
    sdtId?: NodeID
    sdtName?: string
  }
  interface Owner {
    sdtId?: NodeID
    sdtName?: string
    sdtType?: NodeType
    ownedRoots?: Set<SolidRoot>
  }
  interface Computation<Init, Next> {
    sdtId?: NodeID
    sdtType?: NodeType
    ownedRoots?: Set<SolidRoot>
    onValueUpdate?: Record<symbol, ValueUpdateListener>
    onComputationUpdate?: VoidFunction
  }
}

export interface SignalState {
  value: unknown
  observers?: SolidComputation[] | null
  onValueUpdate?: Record<symbol, ValueUpdateListener>
}

export interface SolidSignal extends _SignalState, SignalState {
  value: unknown
  observers: SolidComputation[] | null
}

export interface SolidRoot extends _Owner {
  owned: SolidComputation[] | null
  owner: SolidOwner | null
  sourceMap?: Record<string, SolidSignal>
  isDisposed?: boolean
  // Used by the debugger
  sdtAttached?: true
  sdtContext?: DebuggerContext
  // SolidComputation compatibility
  value?: undefined
  sources?: undefined
  fn?: undefined
  state?: undefined
  sourceSlots?: undefined
  updatedAt?: undefined
  pure?: undefined
}

export interface SolidComputation extends _Computation {
  name: string
  value: unknown
  observers?: SolidComputation[] | null
  owned: SolidComputation[] | null
  owner: SolidOwner | null
  sourceMap?: Record<string, SolidSignal>
  sources: SolidSignal[] | null
  // devtools:
  sdtContext?: undefined
}

export interface SolidMemo extends SolidSignal, SolidComputation {
  name: string
  value: unknown
  observers: SolidComputation[] | null
}

export type SolidOwner = SolidComputation | SolidRoot

export const getOwner = _getOwner as () => SolidOwner | null

export type DebuggerContext =
  | {
      rootId: NodeID
      triggerRootUpdate: VoidFunction
      forceRootUpdate: VoidFunction
    }
  | typeof INTERNAL

export type ComputationUpdate = { rootId: NodeID; nodeId: NodeID }

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export interface MappedRoot {
  id: NodeID
  tree: MappedOwner
  components: MappedComponent[]
}

export interface SerialisedTreeRoot {
  id: NodeID
  tree: MappedOwner
}

export type RootsUpdates = {
  readonly removed: NodeID[]
  readonly updated: SerialisedTreeRoot[]
}

export interface MappedOwner {
  id: NodeID
  name: string
  type: NodeType
  children: MappedOwner[]
  sources: number
}

export interface MappedSignal {
  type: NodeType.Signal | NodeType.Memo
  name: string
  id: NodeID
  observers: NodeID[]
  value: EncodedValue
}

export type MappedComponent = {
  name: string
  /**
   * ! HTMLElements aren't JSON serialisable
   */
  resolved: Many<HTMLElement>
}

export interface MappedOwnerDetails {
  id: NodeID
  name: string
  type: NodeType
  path: NodeID[]
  signals: MappedSignal[]
  /** for computations */
  value?: EncodedValue
  /** for computations */
  sources?: NodeID[]
  /** for memos */
  observers?: NodeID[]
}

export type SignalUpdate = {
  id: NodeID
  value: EncodedValue
}

//
// "Graph___" — owner/signals/etc. objects handled by the devtools frontend (extension/overlay/ui packages)
// They are meant to be "reactive" — wrapped with a store
//

export interface GraphRoot {
  readonly id: NodeID
  readonly tree: GraphOwner
}

export interface GraphOwner {
  readonly id: NodeID
  readonly name: string
  readonly type: NodeType
  readonly dispose: VoidFunction
  readonly sources: number
  readonly children: GraphOwner[]
}

export type GraphSignal = Merge<
  Readonly<MappedSignal>,
  {
    readonly deepValue?: EncodedValue<true>
  }
>

export type OwnerPath = (GraphOwner | typeof NOTFOUND)[]

export interface OwnerDetails {
  readonly id: NodeID
  readonly name: string
  readonly type: NodeType
  readonly path: OwnerPath
  readonly rawPath: NodeID[]
  readonly signals: Record<NodeID, GraphSignal>
  // TODO: more to come
}
