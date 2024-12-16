import type {EncodedValue, PropGetterState} from '../inspector/types.ts'
import type {SourceLocation} from '../locator/types.ts'
import {NodeType, ValueItemType} from './constants.ts'

//
// EXPOSED SOLID API
//

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
    export type OwnerBase = import('solid-js').Owner
    export type SourceMapValue = import('solid-js/types/reactive/signal.d.ts').SourceMapValue
    export type Signal = import('solid-js/types/reactive/signal.d.ts').SignalState<unknown>
    export type Computation = import('solid-js/types/reactive/signal.d.ts').Computation<unknown>
    export type Memo = import('solid-js/types/reactive/signal.d.ts').Memo<unknown>
    export type RootFunction<T> = import('solid-js/types/reactive/signal.d.ts').RootFunction<T>
    export type EffectFunction =
        import('solid-js/types/reactive/signal.d.ts').EffectFunction<unknown>
    export type Component = import('solid-js/types/reactive/signal.d.ts').DevComponent<{
        [key: string]: unknown
    }>

    export type CatchError = Omit<Computation, 'fn'> & {fn: undefined}

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
    export type NotWrappable = import('solid-js/store').NotWrappable
    export type OnStoreNodeUpdate = import('solid-js/store/types/store.d.ts').OnStoreNodeUpdate
    export type Store = SourceMapValue & {value: StoreNode}
}

declare module 'solid-js/types/reactive/signal.d.ts' {
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
            [key: string]: {getter: false | PropGetterState; value: EncodedValue[] | null}
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
        location?: SourceLocation
    }
}
