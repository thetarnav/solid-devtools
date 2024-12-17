import {createEventBus, createGlobalEmitter, type GlobalEmitter} from '@solid-primitives/event-bus'
import {createStaticStore} from '@solid-primitives/static-store'
import {defer} from '@solid-primitives/utils'
import * as s from 'solid-js'
import {log_message} from '@solid-devtools/shared/utils'
import {createDependencyGraph, type DGraphUpdate} from '../dependency/index.ts'
import {createInspector, type InspectorUpdate, type ToggleInspectedValueData} from '../inspector/index.ts'
import {createLocator} from '../locator/index.ts'
import {type HighlightElementPayload} from '../locator/types.ts'
import {createStructure, type StructureUpdates} from '../structure/index.ts'
import {DebuggerModule, DEFAULT_MAIN_VIEW, DevtoolsMainView, TreeWalkerMode} from './constants.ts'
import {getObjectById, getSdtId, ObjectType} from './id.ts'
import setup from './setup.ts'
import {type Mapped, type NodeID} from './types.ts'
import {createBatchedUpdateEmitter} from './utils.ts'

export namespace Debugger {
    export type InspectedState = {
        readonly ownerId: NodeID | null
        readonly signalId: NodeID | null
        /** closest note to inspected signal/owner on the owner structure */
        readonly treeWalkerOwnerId: NodeID | null
    }

    export type OutputChannels = {
        DebuggerEnabled: boolean
        ResetPanel: void
        InspectedState: InspectedState
        InspectedNodeDetails: Mapped.OwnerDetails
        StructureUpdates: StructureUpdates
        NodeUpdates: NodeID[]
        InspectorUpdate: InspectorUpdate[]
        LocatorModeChange: boolean
        HoveredComponent: {nodeId: NodeID; state: boolean}
        InspectedComponent: NodeID
        DgraphUpdate: DGraphUpdate
    }

    export type InputChannels = {
        ResetState: void
        InspectNode: {ownerId: NodeID | null; signalId: NodeID | null} | null
        InspectValue: ToggleInspectedValueData
        HighlightElementChange: HighlightElementPayload
        OpenLocation: void
        TreeViewModeChange: TreeWalkerMode
        ViewChange: DevtoolsMainView
        ToggleModule: {module: DebuggerModule; enabled: boolean}
    }
}

export type DebuggerEmitter = {
    output: GlobalEmitter<Debugger.OutputChannels>
    input: GlobalEmitter<Debugger.InputChannels>
}


const hub: DebuggerEmitter = {
    output: createGlobalEmitter(),
    input: createGlobalEmitter(),
}

//
// Debugger Enabled
//
const [modules, toggleModules] = createStaticStore({
    debugger: false,
    locator:  false,
    dgraph:   false,
    locatorKeyPressSignal: (): boolean => false,
})

// The debugger can be enabled by devtools or by the locator
const debuggerEnabled = s.createMemo(() => modules.debugger || modules.locatorKeyPressSignal())
const dgraphEnabled = s.createMemo(() => modules.dgraph && debuggerEnabled())
// locator is enabled if debugger is enabled, and user pressed the key to activate it, or the plugin activated it
const locatorEnabled = s.createMemo(
    () => (modules.locatorKeyPressSignal() || modules.locator) && debuggerEnabled(),
)

s.createEffect(
    defer(debuggerEnabled, enabled => {
        hub.output.emit('DebuggerEnabled', enabled)
    }),
)

//
// Current Open VIEW (currently not used)
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let currentView: DevtoolsMainView = DEFAULT_MAIN_VIEW
const viewChange = createEventBus<DevtoolsMainView>()

function setView(view: DevtoolsMainView) {
    s.batch(() => {
        // setStructureEnabled(view === DevtoolsMainView.Structure)
        // setDgraphEnabled(view === DevtoolsMainView.Dgraph)
        viewChange.emit((currentView = view))
    })
}

//
// Enabled Modules
//
function toggleModule(data: Debugger.InputChannels['ToggleModule']): void {
    switch (data.module) {
        case DebuggerModule.Structure:
            // * Structure is always enabled
            break
        case DebuggerModule.Dgraph:
            toggleModules('dgraph', data.enabled)
            break
        case DebuggerModule.Locator:
            toggleModules('locator', data.enabled)
            break
    }
}

//
// Inspected Node
//

// Current inspected node is shared between modules
const INITIAL_INSPECTED_STATE = {
    ownerId: null,
    signalId: null,
    treeWalkerOwnerId: null,
} as const satisfies Debugger.OutputChannels['InspectedState']

const [inspectedState, setInspectedState] = s.createSignal<
    Debugger.OutputChannels['InspectedState']
>(INITIAL_INSPECTED_STATE, {equals: false})
const inspectedOwnerId = s.createMemo(() => inspectedState().ownerId)

s.createEffect(() => hub.output.emit('InspectedState', inspectedState()))

function getTreeWalkerOwnerId(ownerId: NodeID | null): NodeID | null {
    const owner = ownerId && getObjectById(ownerId, ObjectType.Owner)
    const treeWalkerOwner = owner && structure.getClosestIncludedOwner(owner)
    return treeWalkerOwner ? getSdtId(treeWalkerOwner, ObjectType.Owner) : null
}

/** Check if the inspected node doesn't need to change (treeview mode changed or sth) */
function updateInspectedNode() {
    setInspectedState(p => ({
        ...p,
        treeWalkerOwnerId: getTreeWalkerOwnerId(p.treeWalkerOwnerId),
    }))
}

function resetInspectedNode() {
    setInspectedState(INITIAL_INSPECTED_STATE)
}

function setInspectedNode(data: Debugger.InputChannels['InspectNode']): void {
    let {ownerId, signalId} = data ?? {ownerId: null, signalId: null}
    if (ownerId && !getObjectById(ownerId, ObjectType.Owner)) ownerId = null
    if (signalId && !getObjectById(signalId, ObjectType.Signal)) signalId = null
    setInspectedState({
        ownerId,
        signalId,
        treeWalkerOwnerId: getTreeWalkerOwnerId(ownerId),
    })
}

s.createComputed(
    defer(debuggerEnabled, enabled => {
        if (!enabled) resetInspectedNode()
    }),
)

// Computation and signal updates
const pushNodeUpdate = createBatchedUpdateEmitter<NodeID>(updates => {
    hub.output.emit('NodeUpdates', updates)
})

//
// Structure:
//
const structure = createStructure({
    onStructureUpdate(updates) {
        hub.output.emit('StructureUpdates', updates)
        updateInspectedNode()
    },
    onNodeUpdate: pushNodeUpdate,
    enabled: debuggerEnabled,
    listenToViewChange: viewChange.listen,
})

//
// Inspected Owner details:
//
const inspector = createInspector({
    emit: hub.output.emit,
    enabled: debuggerEnabled,
    inspectedOwnerId,
    resetInspectedNode,
})

//
// Dependency Graph
//
createDependencyGraph({
    emit: hub.output.emit,
    enabled: dgraphEnabled,
    listenToViewChange: viewChange.listen,
    onNodeUpdate: pushNodeUpdate,
    inspectedState,
})

//
// Locator
//
const locator = createLocator({
    emit: hub.output.emit,
    locatorEnabled,
    setLocatorEnabledSignal: signal => toggleModules('locatorKeyPressSignal', () => signal),
    onComponentClick(componentId, next) {
        modules.debugger ? hub.output.emit('InspectedComponent', componentId) : next()
    },
})

// Opens the source code of the inspected component
function openInspectedNodeLocation() {
    const details = inspector.getLastDetails()
    details?.location && locator.openElementSourceCode(details.location, details.name)
}

// send the state of the client locator mode
s.createEffect(
    defer(modules.locatorKeyPressSignal, state => hub.output.emit('LocatorModeChange', state)),
)

hub.input.listen(e => {

    DEV: {log_message('Debugger', 'Client', e)}

    switch (e.name) {
    case 'ResetState': {
        // reset all the internal state
        s.batch(() => {
            resetInspectedNode()
            currentView = DEFAULT_MAIN_VIEW
            structure.resetTreeWalkerMode()
            locator.setDevtoolsHighlightTarget(null)
        })
        break
    }
    case 'HighlightElementChange':
        return locator.setDevtoolsHighlightTarget(e.details)
    case 'InspectNode':
        return setInspectedNode(e.details)
    case 'InspectValue':
        return inspector.toggleValueNode(e.details)
    case 'OpenLocation':
        return openInspectedNodeLocation()
    case 'TreeViewModeChange':
        return structure.setTreeWalkerMode(e.details)
    case 'ViewChange':
        return setView(e.details)
    case 'ToggleModule':
        return toggleModule(e.details)
    }
})

/**
 * Used for connecting debugger to devtools
 */
export function useDebugger() {
    return {
        meta: {
            versions: setup.versions,
        },
        enabled: debuggerEnabled,
        toggleEnabled: (enabled: boolean) => void toggleModules('debugger', enabled),
        on: hub.output.on,
        listen: hub.output.listen,
        emit: hub.input.emit,
    }
}

export const useLocator = locator.useLocator
