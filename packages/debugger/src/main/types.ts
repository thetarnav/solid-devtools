import type { EncodedValue } from '../inspector/types'
import type { LocationAttr } from '../locator/findComponent'
import { NodeType, $SDT_ID } from './constants'

export type NodeID = string & {}

export type ValueItemID = `signal:${NodeID}` | `prop:${string}` | `value`
export type ValueItemType = 'signal' | 'prop' | 'value'

export const getValueItemId = <T extends ValueItemType>(
  type: T,
  id: T extends 'value' ? undefined : NodeID | string,
): ValueItemID => {
  if (type === 'value') return 'value'
  return `${type}:${id}` as ValueItemID
}

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

export namespace Core {
  export type Owner = import('solid-js/types/reactive/signal').Owner
  export type SignalState = import('solid-js/types/reactive/signal').SignalState<unknown>
  export type Computation = import('solid-js/types/reactive/signal').Computation<unknown>
  export type RootFunction<T> = import('solid-js/types/reactive/signal').RootFunction<T>
  export type EffectFunction = import('solid-js/types/reactive/signal').EffectFunction<unknown>
  export type Component = import('solid-js/types/reactive/signal').DevComponent<{
    [key: string]: unknown
  }>
  export namespace Store {
    export type StoreNode = import('solid-js/store').StoreNode
    export type NotWrappable = import('solid-js/store/types/store').NotWrappable
    export type OnStoreNodeUpdate = import('solid-js/store/types/store').OnStoreNodeUpdate
  }
}

declare global {
  interface Element {
    [$SDT_ID]?: NodeID
  }
}

declare module 'solid-js/types/reactive/signal' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface SignalState<T> {
    [$SDT_ID]?: NodeID
    sdtName?: string
  }
  interface Owner {
    [$SDT_ID]?: NodeID
    sdtName?: string
    sdtType?: NodeType
    sdtSubRoots?: Solid.Root[] | null
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Computation<Init, Next> {
    [$SDT_ID]?: NodeID
    sdtType?: NodeType
    onValueUpdate?: Record<symbol, ValueUpdateListener>
    onComputationUpdate?: VoidFunction
  }
}

declare module 'solid-js/store' {
  interface StoreNode {
    [$SDT_ID]?: NodeID
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

  export interface Store {
    value: Core.Store.StoreNode
    [$SDT_ID]?: NodeID
  }

  export interface Root extends Core.Owner {
    owned: Computation[] | null
    owner: Owner | null
    sourceMap?: Record<string, Signal | Store>
    // Used by the debugger
    isDisposed?: boolean
    // TODO: remove
    sdtAttached?: Owner
    isInternal?: true
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
  }

  export interface Memo extends Signal, Computation {
    name: string
    value: unknown
    observers: Computation[] | null
  }

  export interface Component extends Memo {
    props: Record<string, unknown>
    componentName: string
    location?: LocationAttr
  }

  export type Owner = Computation | Root
}

//
// "Mapped___" should be JSON serialisable — to be able to send them with chrome.runtime.sendMessage
//

export namespace Mapped {
  export interface Owner {
    id: NodeID
    type: Exclude<NodeType, NodeType.Refresh | NodeType.Signal | NodeType.Store>
    // combines?: NodeID[]
    children: Owner[]
    name?: string
    // component wrapped with a hmr memo?
    hmr?: true
    // computation without sources
    frozen?: true
  }

  export interface Signal {
    type: NodeType.Signal | NodeType.Memo | NodeType.Store
    name: string
    id: NodeID
    value: EncodedValue[]
  }

  export type Props = {
    proxy: boolean
    /**
     * Record: `propName` -- `propValue`. If `propValue` is `null`, it means that the prop is a getter
     */
    record: { [key: string]: EncodedValue[] | null }
  }

  export interface OwnerDetails {
    id: NodeID
    name: string
    type: NodeType
    props?: Props
    signals: Signal[]
    /** for computations */
    value?: EncodedValue[]
    // component with a location
    location?: LocationAttr
  }
}

export type ComputationUpdate = { rootId: NodeID; id: NodeID }

export type StructureUpdates = {
  removed: NodeID[]
  /** Record: `rootId` -- Record of updated nodes by `nodeId` */
  updated: Partial<Record<NodeID, Partial<Record<NodeID, Mapped.Owner>>>>
}
