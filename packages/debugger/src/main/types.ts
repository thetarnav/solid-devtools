import type { $PROXY, DEV, getListener, getOwner, onCleanup, untrack } from 'solid-js'
import type { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import type { EncodedValue, PropGetterState } from '../inspector/types'
import type { LocationAttr } from '../locator/findComponent'
import type { LocatorOptions } from '../locator/types'
import { NodeType, ValueItemType } from './constants'

//
// EXPOSED SOLID API
//

export const enum DevEventType {
  RootCreated = 'RootCreated',
}

export type DevEventDataMap = {
  [DevEventType.RootCreated]: Solid.Owner
}

export type StoredDevEvent = {
  [K in keyof DevEventDataMap]: {
    timestamp: number
    type: K
    data: DevEventDataMap[K]
  }
}[keyof DevEventDataMap]

declare global {
  interface Window {
    /** Solid DEV APIs exposed to the debugger by the setup script */
    _$SolidDevAPI?: {
      readonly DEV: NonNullable<typeof DEV>
      readonly getOwner: typeof getOwner
      readonly getListener: typeof getListener
      readonly onCleanup: typeof onCleanup
      readonly $PROXY: typeof $PROXY
      readonly untrack: typeof untrack
      readonly STORE_DEV: NonNullable<typeof STORE_DEV>
      readonly unwrap: typeof unwrap
      readonly getDevEvents: () => StoredDevEvent[]
      readonly locatorOptions: LocatorOptions | null
      readonly versions: {
        readonly client: string | null
        readonly solid: string | null
        readonly expectedSolid: string | null
      }
    }
  }
}

// Additional "#" character is added to distinguish NodeID from string
export type NodeID = `#${string}`

export type ValueItemID =
  | `${ValueItemType.Signal}:${NodeID}`
  | `${ValueItemType.Prop}:${string}`
  | ValueItemType.Value

export const getValueItemId = <T extends ValueItemType>(
  type: T,
  id: T extends ValueItemType.Value ? undefined : NodeID | string,
): ValueItemID => {
  if (type === ValueItemType.Value) return ValueItemType.Value
  return `${type}:${id}` as ValueItemID
}

export type ValueUpdateListener = (newValue: unknown, oldValue: unknown) => void

export namespace Solid {
  export type OwnerBase = import('solid-js/types/reactive/signal').Owner
  export type SourceMapValue = import('solid-js/types/reactive/signal').SourceMapValue
  export type Signal = import('solid-js/types/reactive/signal').SignalState<unknown>
  export type Computation = import('solid-js/types/reactive/signal').Computation<unknown>
  export type Memo = import('solid-js/types/reactive/signal').Memo<unknown>
  export type RootFunction<T> = import('solid-js/types/reactive/signal').RootFunction<T>
  export type EffectFunction = import('solid-js/types/reactive/signal').EffectFunction<unknown>
  export type Component = import('solid-js/types/reactive/signal').DevComponent<{
    [key: string]: unknown
  }>

  export type CatchError = Omit<Computation, 'fn'> & { fn: undefined }

  export type Root = OwnerBase & {
    attachedTo?: Owner
    isDisposed?: true
    isInternal?: true

    context: null
    fn?: never
    state?: never
    updatedAt?: never
    sources?: never
    sourceSlots?: never
    value?: never
    pure?: never
  }

  export type Owner = Root | Computation | CatchError

  //
  // STORE
  //

  export type StoreNode = import('solid-js/store').StoreNode
  export type NotWrappable = import('solid-js/store/types/store').NotWrappable
  export type OnStoreNodeUpdate = import('solid-js/store/types/store').OnStoreNodeUpdate
  export type Store = SourceMapValue & { value: StoreNode }
}

declare module 'solid-js/types/reactive/signal' {
  interface Owner {
    sdtType?: NodeType
    sdtSubRoots?: Solid.Owner[] | null
  }
}

//
// "Signal___" — owner/signals/etc. objects in the Solid's internal owner graph
//

export type OnStoreNodeUpdate = Solid.OnStoreNodeUpdate & {
  storePath: readonly (string | number)[]
  storeSymbol: symbol
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
    name?: string
    id: NodeID
    value: EncodedValue[]
  }

  export type Props = {
    proxy: boolean
    record: {
      [key: string]: { getter: false | PropGetterState; value: EncodedValue[] | null }
    }
  }

  export interface OwnerDetails {
    id: NodeID
    name?: string
    type: NodeType
    props?: Props
    signals: Signal[]
    /** for computations */
    value?: EncodedValue[]
    // component with a location
    location?: LocationAttr
  }
}
