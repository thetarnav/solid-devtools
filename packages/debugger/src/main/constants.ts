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
    Root = 'root',
    Component = 'component',
    Element = 'element',
    Effect = 'effect',
    Render = 'render',
    Memo = 'memo',
    Computation = 'computation',
    Refresh = 'refresh',
    Context = 'context',
    CatchError = 'catchError',
    Signal = 'signal',
    Store = 'store',
}

export const NODE_TYPE_NAMES: Readonly<Record<NodeType, string>> = {
    [NodeType.Root]: 'Root',
    [NodeType.Component]: 'Component',
    [NodeType.Element]: 'Element',
    [NodeType.Effect]: 'Effect',
    [NodeType.Render]: 'Render Effect',
    [NodeType.Memo]: 'Memo',
    [NodeType.Computation]: 'Computation',
    [NodeType.Refresh]: 'Refresh',
    [NodeType.Context]: 'Context',
    [NodeType.CatchError]: 'CatchError',
    [NodeType.Signal]: 'Signal',
    [NodeType.Store]: 'Store',
}

export enum ValueItemType {
    Signal = 'signal',
    Prop = 'prop',
    Value = 'value',
}

export const UNKNOWN = 'unknown'

export const OWNER_LOCATION_PROP = 'sdtLocation'
