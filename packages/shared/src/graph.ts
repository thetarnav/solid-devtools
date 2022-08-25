import { getOwner as _getOwner } from "solid-js"
import { Many } from "@solid-primitives/utils"
import { INTERNAL, NOTFOUND } from "./variables"
import { EncodedValue } from "./serialize"

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

export namespace Core {
  export type Owner = import("solid-js/types/reactive/signal").Owner
  export type SignalState = import("solid-js/types/reactive/signal").SignalState<unknown>
  export type Computation = import("solid-js/types/reactive/signal").Computation<unknown>
  export type RootFunction<T> = import("solid-js/types/reactive/signal").RootFunction<T>
  export type EffectFunction = import("solid-js/types/reactive/signal").EffectFunction<unknown>
}

declare module "solid-js/types/reactive/signal" {
  interface SignalState<T> {
    sdtId?: NodeID
    sdtName?: string
  }
  interface Owner {
    sdtId?: NodeID
    sdtName?: string
    sdtType?: NodeType
    ownedRoots?: Set<Solid.Root>
  }
  interface Computation<Init, Next> {
    sdtId?: NodeID
    sdtType?: NodeType
    ownedRoots?: Set<Solid.Root>
    onValueUpdate?: Record<symbol, ValueUpdateListener>
    onComputationUpdate?: VoidFunction
  }
}

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

export namespace Solid {
  export interface SignalState {
    value: unknown
    observers?: Computation[] | null
    onValueUpdate?: Record<symbol, ValueUpdateListener>
  }

  export interface Signal extends Core.SignalState, SignalState {
    value: unknown
    observers: Computation[] | null
  }

  export interface Root extends Core.Owner {
    owned: Computation[] | null
    owner: Owner | null
    sourceMap?: Record<string, Signal>
    isDisposed?: boolean
    // Used by the debugger
    sdtAttached?: true
    sdtContext?: DebuggerContext
    // Computation compatibility
    value?: undefined
    sources?: undefined
    fn?: undefined
    state?: undefined
    sourceSlots?: undefined
    updatedAt?: undefined
    pure?: undefined
  }

  export interface Computation extends Core.Computation {
    name: string
    value: unknown
    observers?: Computation[] | null
    owned: Computation[] | null
    owner: Owner | null
    sourceMap?: Record<string, Signal>
    sources: Signal[] | null
    // devtools:
    sdtContext?: undefined
  }

  export interface Memo extends Signal, Computation {
    name: string
    value: unknown
    observers: Computation[] | null
  }

  export type Owner = Computation | Root
}

export const getOwner = _getOwner as () => Solid.Owner | null

export type DebuggerContext =
  | {
      rootId: NodeID
      triggerRootUpdate: VoidFunction
      forceRootUpdate: VoidFunction
    }
  | typeof INTERNAL

export type ComputationUpdate = { rootId: NodeID; id: NodeID }

export type RootsUpdates = {
  removed: NodeID[]
  updated: Mapped.SRoot[]
}

export type SignalUpdate = {
  id: NodeID
  value: EncodedValue<boolean>
}

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

//
// "Mapped___" — owner/signal/etc. objects created by the solid-devtools-debugger runtime library
// They should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export namespace Mapped {
  export interface Root {
    id: NodeID
    tree: Owner
    components: Record<NodeID, Component>
  }

  /** serialised (without components) */
  export interface SRoot {
    id: NodeID
    tree: Owner
  }

  export interface Owner {
    id: NodeID
    name: string
    type: NodeType
    children: Owner[]
    sources: number
  }

  export interface Signal {
    type: NodeType.Signal | NodeType.Memo
    name: string
    id: NodeID
    observers: NodeID[]
    value: EncodedValue<false>
  }

  export type Component = {
    name: string
    /**
     * ! HTMLElements aren't JSON serialisable
     */
    resolved: Many<HTMLElement>
  }

  export interface OwnerDetails {
    id: NodeID
    name: string
    type: NodeType
    path: NodeID[]
    signals: Signal[]
    /** for computations */
    value?: EncodedValue
    /** for computations */
    sources?: NodeID[]
    /** for memos */
    observers?: NodeID[]
  }
}

//
// "Graph___" — owner/signals/etc. objects handled by the devtools frontend (extension/overlay/ui packages)
// They are meant to be "reactive" — wrapped with a store
//

export namespace Graph {
  export interface Root {
    readonly id: NodeID
    readonly tree: Owner
  }

  export interface Owner {
    readonly id: NodeID
    readonly name: string
    readonly type: NodeType
    readonly dispose: VoidFunction
    readonly sources: number
    readonly children: Owner[]
  }

  export type Signal = {
    readonly type: NodeType.Signal | NodeType.Memo
    readonly name: string
    readonly id: NodeID
    readonly observers: NodeID[]
    readonly value: EncodedValue<boolean>
    readonly selected: boolean
  }

  export type Path = (Owner | typeof NOTFOUND)[]

  export interface OwnerDetails {
    readonly id: NodeID
    readonly name: string
    readonly type: NodeType
    readonly path: Path
    readonly rawPath: NodeID[]
    readonly signals: Record<NodeID, Signal>
    // TODO: more to come
  }
}
