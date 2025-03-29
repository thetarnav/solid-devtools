import type {Union} from '@solid-devtools/shared/utils'
import type {EncodedValue, InspectorUpdate, PropGetterState, ToggleInspectedValueData} from '../inspector/types.ts'
import * as locator from '../locator/locator.ts'
import type {StructureUpdates, DGraphUpdate} from '../types.ts'

/**
 * Main modules and views of the devtools. Used for "routing".
 */
export enum DevtoolsMainView {
    Structure = 'structure',
}
export const DEFAULT_MAIN_VIEW = DevtoolsMainView.Structure

export enum DebuggerModule {
    Locator = 'locator',
    Structure = 'structure',
    Dgraph = 'dgraph',
}

export enum TreeWalkerMode {
    Owners = 'owners',
    Components = 'components',
    DOM = 'dom',
}
export const DEFAULT_WALKER_MODE = TreeWalkerMode.Components

export enum NodeType {
    Root        = 'ROOT',
    Component   = 'COMPONENT',
    Element     = 'ELEMENT',
    Effect      = 'EFFECT',
    Render      = 'RENDER',
    Memo        = 'MEMO',
    Computation = 'COMPUTATION',
    Refresh     = 'REFRESH',
    Context     = 'CONTEXT',
    CatchError  = 'CATCH_ERROR',
    Signal      = 'SIGNAL',
    Store       = 'STORE',
    CustomValue = 'CUSTOM_VALUE',
}

export const NODE_TYPE_NAMES: Readonly<Record<NodeType, string>> = {
    [NodeType.Root]:        'Root',
    [NodeType.Component]:   'Component',
    [NodeType.Element]:     'Element',
    [NodeType.Effect]:      'Effect',
    [NodeType.Render]:      'Render Effect',
    [NodeType.Memo]:        'Memo',
    [NodeType.Computation]: 'Computation',
    [NodeType.Refresh]:     'Refresh',
    [NodeType.Context]:     'Context',
    [NodeType.CatchError]:  'CatchError',
    [NodeType.Signal]:      'Signal',
    [NodeType.Store]:       'Store',
    [NodeType.CustomValue]: 'Custom Value',
}

export type NodeData = {
    [NodeType.Root]:        Solid.Root,
    [NodeType.Component]:   Solid.Component,
    [NodeType.Element]:     Element,
    [NodeType.Effect]:      Solid.Computation,
    [NodeType.Render]:      Solid.Computation,
    [NodeType.Memo]:        Solid.Memo,
    [NodeType.Computation]: Solid.Computation,
    [NodeType.Refresh]:     Solid.Memo,
    [NodeType.Context]:     Solid.Computation,
    [NodeType.CatchError]:  Solid.Computation,
    [NodeType.Signal]:      Solid.Signal,
    [NodeType.Store]:       Solid.Store,
    [NodeType.CustomValue]: Solid.SourceMapValue,
}
export type Node = Union<NodeData>

export enum ValueItemType {
    Signal = 'signal',
    Prop   = 'prop',
    Value  = 'value',
}

export const UNKNOWN = 'unknown'

export const OWNER_LOCATION_PROP = 'sdtLocation'

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
    HighlightElementChange: locator.HighlightElementPayload
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

export type SourceLocation = {
    file:   string
    line:   number
    column: number
}

export type Rect = {
    x: number
    y: number
    w: number
    h: number
}

/**
 * When using a custom solid renderer, you should provide a custom element interface.
 * By default the debugger assumes that rendered elements are DOM elements.
 */
export type ElementInterface<T extends object> = {
    isElement:    (obj: object | T) => obj is T,
    getName:      (el: T) => string | null,
    getChildren:  (el: T) => Iterable<T>,
    getParent:    (el: T) => T | null,
    getElementAt: (e: MouseEvent) => T | null,
    getLocation:  (el: T) => SourceLocation | null,
    getRect:      (el: T) => Rect | null,
}

/**
 * Implementation of {@link ElementInterface} for {@link Element}
 */
export const dom_element_interface: ElementInterface<Element> = {
    isElement:    obj => obj instanceof Element,
    getName:      el => el.localName,
    getChildren:  el => el.children,
    getParent:    el => el.parentElement,
    getElementAt: e => e.target as Element | null,
    getLocation:  el => {
        let attr = locator.getLocationAttr(el)
        if (attr == null) return null
        return locator.parseLocationString(attr) ?? null
    },
    getRect:      el => {
        let rect = el.getBoundingClientRect()
        return {x: rect.x, y: rect.y, w: rect.width, h: rect.height}
    },
}

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
