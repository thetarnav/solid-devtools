import type { NodeID, NodeType } from '@solid-devtools/shared/graph'
import type { $ON_UPDATE } from 'solid-js/store/types/store'
import type { INTERNAL, $SDT_ID } from './utils'

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

export type DebuggerContext =
  | {
      rootId: NodeID
      triggerRootUpdate: VoidFunction
      forceRootUpdate: VoidFunction
    }
  | typeof INTERNAL

export namespace Core {
  export type Owner = import('solid-js/types/reactive/signal').Owner
  export type SignalState = import('solid-js/types/reactive/signal').SignalState<unknown>
  export type Computation = import('solid-js/types/reactive/signal').Computation<unknown>
  export type RootFunction<T> = import('solid-js/types/reactive/signal').RootFunction<T>
  export type EffectFunction = import('solid-js/types/reactive/signal').EffectFunction<unknown>
  export namespace Store {
    export type StoreNode = import('solid-js/store').StoreNode
    export type NotWrappable = import('solid-js/store/types/store').NotWrappable
    export type OnStoreNodeUpdate = import('solid-js/store/types/store').OnStoreNodeUpdate
  }
}

declare module 'solid-js/types/reactive/signal' {
  interface SignalState<T> {
    [$SDT_ID]?: NodeID
    sdtName?: string
  }
  interface Owner {
    [$SDT_ID]?: NodeID
    sdtName?: string
    sdtType?: NodeType
  }
  interface Computation<Init, Next> {
    [$SDT_ID]?: NodeID
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

  export type OnStoreNodeUpdate = Core.Store.OnStoreNodeUpdate & {
    storePath: readonly (string | number)[]
    storeSymbol: symbol
  }

  export interface StoreNode extends Core.Store.StoreNode {
    [$ON_UPDATE]?: OnStoreNodeUpdate[]
  }

  export interface Store {
    value: StoreNode
    [$SDT_ID]?: NodeID
  }

  export interface Root extends Core.Owner {
    owned: Computation[] | null
    owner: Owner | null
    sourceMap?: Record<string, Signal | Store>
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
    componentName: string
  }

  export type Owner = Computation | Root
}
