import { getOwner as _getOwner } from "solid-js"
import { JsonValue } from "type-fest"
import { Many } from "@solid-primitives/utils"
import { UpdateType } from "./bridge"
import { Owner as _Owner, SignalState as _SignalState, Computation as _Computation } from "./solid"
import { INTERNAL } from "./variables"

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

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

declare module "solid-js/types/reactive/signal" {
  interface SignalState<T> {
    sdtId?: number
    sdtName?: string
  }
  interface Owner {
    sdtId?: number
    sdtName?: string
    sdtType?: NodeType
    ownedRoots?: Set<SolidRoot>
  }
  interface Computation<Init, Next> {
    sdtId?: number
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
      rootId: number
      triggerRootUpdate: VoidFunction
      forceRootUpdate: VoidFunction
    }
  | typeof INTERNAL

export type BatchedUpdate =
  | {
      type: UpdateType.Signal
      payload: SignalUpdatePayload
    }
  | {
      type: UpdateType.Computation
      payload: number
    }

export interface SignalUpdatePayload {
  id: number
  value: unknown
  oldValue: unknown
}

export type BatchUpdateListener = (updates: BatchedUpdate[]) => void

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export interface MappedRoot {
  id: number
  tree: MappedOwner
  components: MappedComponent[]
}

export interface SerialisedTreeRoot {
  id: number
  tree: MappedOwner
}

export interface MappedOwner {
  id: number
  name: string
  type: NodeType
  children: MappedOwner[]
  sources: number[]
}

export interface MappedSignal {
  name: string
  id: number
  observers: number[]
  value: JsonValue
}

export type MappedComponent = {
  name: string
  // ! HTMLElements aren't JSON serialisable
  resolved: Many<HTMLElement>
}

export interface OwnerDetails {
  id: number
  name: string
  type: NodeType
  path: number[]
  signals: MappedSignal[]
  memos: MappedSignal[]
}

//
// "Graph___" — owner/signals/etc. objects handled by the devtools frontend (extension/overlay/ui packages)
// They are meant to be "reactive" — wrapped with a store
//

export interface GraphOwner {
  readonly id: number
  readonly name: string
  readonly type: NodeType
  readonly dispose: VoidFunction
  readonly updated: boolean
  readonly setUpdate: (value: boolean) => void
  sources: GraphSignal[]
  readonly children: GraphOwner[]
}

export interface GraphSignal {
  readonly id: number
  readonly name: string
  readonly dispose?: VoidFunction
  readonly updated: boolean
  readonly setUpdate: (value: boolean) => void
  readonly value: JsonValue
  readonly setValue: (value: unknown) => void
  readonly observers: GraphOwner[]
}

export interface GraphRoot {
  readonly id: number
  readonly tree: GraphOwner
}
