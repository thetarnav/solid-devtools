import { getOwner as _getOwner } from "solid-js"
import { Many } from "@solid-primitives/utils"
import { INTERNAL } from "./variables"
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
  }
  interface Computation<Init, Next> {
    sdtId?: NodeID
    sdtType?: NodeType
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
    // Used by the debugger
    isDisposed?: boolean
    sdtAttached?: Owner | null
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

  export interface Component extends Memo {
    props: Record<string, unknown>
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
  updated: Record<NodeID, Mapped.Root>
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
    name?: undefined
    type: NodeType.Root
    children?: Owner[]
    // sub-roots will have an owner
    attached?: NodeID
  }

  export interface Component {
    id: NodeID
    type: NodeType.Component
    children?: Owner[]
    name: string
    hmr: boolean
  }

  export interface Computation {
    id: NodeID
    type: Exclude<NodeType, NodeType.Refresh | NodeType.Root | NodeType.Component>
    children?: Owner[]
    name: string
    frozen?: true
  }

  export type Owner = Component | Computation

  export interface Signal {
    type: NodeType.Signal | NodeType.Memo
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
