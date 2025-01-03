import type {Union} from '@solid-devtools/shared/utils'
import type {EncodedValue, InspectorUpdate, PropGetterState, ToggleInspectedValueData} from '../inspector/types.ts'
import type {HighlightElementPayload, SourceLocation} from '../locator/types.ts'
import type {StructureUpdates, DGraphUpdate} from '../types.ts'
import {DebuggerModule, DevtoolsMainView, NodeType, OWNER_LOCATION_PROP, TreeWalkerMode, ValueItemType} from './constants.ts'

export type InspectedState = {
    readonly ownerId: NodeID | null
    readonly signalId: NodeID | null
    /** closest note to inspected signal/owner on the owner structure */
    readonly treeWalkerOwnerId: NodeID | null
}

export const INSPECTED_STATE_NULL: InspectedState = {
    ownerId:           null,
    signalId:          null,
    treeWalkerOwnerId: null,
}

export type OutputChannels = {
    DebuggerEnabled:        boolean
    ResetPanel:             void
    InspectedState:         InspectedState
    InspectedNodeDetails:   Mapped.OwnerDetails
    StructureUpdates:       StructureUpdates
    NodeUpdates:            NodeID[]
    InspectorUpdate:        InspectorUpdate[]
    LocatorModeChange:      boolean
    HoveredComponent:       {nodeId: NodeID; state: boolean}
    InspectedComponent:     NodeID
    DgraphUpdate:           DGraphUpdate
}

export type InputChannels = {
    ResetState:             void
    InspectNode:            {ownerId: NodeID | null; signalId: NodeID | null} | null
    InspectValue:           ToggleInspectedValueData
    ConsoleInspectValue:    ValueItemID
    HighlightElementChange: HighlightElementPayload
    OpenLocation:           void
    TreeViewModeChange:     TreeWalkerMode
    ViewChange:             DevtoolsMainView
    ToggleModule:           {module: DebuggerModule; enabled: boolean}
}

export type InputMessage  = Union<InputChannels>
export type InputListener = (e: InputMessage) => void

export type OutputMessage  = Union<OutputChannels>
export type OutputListener = (e: OutputMessage) => void

export type OutputEmit = (e: OutputMessage) => void

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
        [OWNER_LOCATION_PROP]?: string
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

    export interface SourceValue {
        type:  NodeType.Signal | NodeType.Memo | NodeType.Store | NodeType.CustomValue
        name?: string
        id:    NodeID
        value: EncodedValue[]
    }

    export type Props = {
        proxy: boolean
        record: {
            [key: string]: {getter: false | PropGetterState; value: EncodedValue[] | null}
        }
    }

    export interface OwnerDetails {
        id:        NodeID
        name?:     string
        type:      NodeType
        props?:    Props
        signals:   SourceValue[]
        /** for computations */
        value?:    EncodedValue[]
        // component with a location
        location?: SourceLocation
        // component wrapped with a hmr memo?
        hmr?:      true
    }
}
