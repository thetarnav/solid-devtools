import {createStaticStore} from '@solid-primitives/static-store'
import {defer} from '@solid-primitives/utils'
import * as s from 'solid-js'
import {log_message, mutate_remove, type Message} from '@solid-devtools/shared/utils'
import {createDependencyGraph, type DGraphUpdate} from '../dependency/index.ts'
import {createInspector, type InspectorUpdate, type ToggleInspectedValueData} from '../inspector/index.ts'
import {createLocator} from '../locator/index.ts'
import {type HighlightElementPayload} from '../locator/types.ts'
import {createStructure, type StructureUpdates} from '../structure/index.ts'
import {DebuggerModule, DEFAULT_MAIN_VIEW, DevtoolsMainView, TreeWalkerMode} from './constants.ts'
import {getObjectById, getSdtId, ObjectType} from './id.ts'
import setup from './setup.ts'
import {type Mapped, type NodeID, type ValueItemID} from './types.ts'

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
    ConsoleInspectValue: ValueItemID
    HighlightElementChange: HighlightElementPayload
    OpenLocation: void
    TreeViewModeChange: TreeWalkerMode
    ViewChange: DevtoolsMainView
    ToggleModule: {module: DebuggerModule; enabled: boolean}
}

export type InputMessage = {
    [K in keyof InputChannels]: Message<K, InputChannels[K]>
}[keyof InputChannels]
export type InputListener = (e: InputMessage) => void

export type OutputMessage = {
    [K in keyof OutputChannels]: Message<K, OutputChannels[K]>
}[keyof OutputChannels]
export type OutputListener = (e: OutputMessage) => void

export type OutputEmit = <K extends keyof OutputChannels>(name: K, details: OutputChannels[K]) => void

function createDebugger() {

    const _output_listeners: OutputListener[] = []
    
    function listen(listener: OutputListener): (() => void) {
        _output_listeners.push(listener)
        return () => mutate_remove(_output_listeners, listener)
    }
    
    function emitOutputObj(e: OutputMessage) {
    
        DEV: {log_message('Client', 'Debugger', e)}
    
        for (let fn of _output_listeners) fn(e)
    }
    const emitOutput: OutputEmit = (name, details) => {
        emitOutputObj({name, details} as any)
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
    const debuggerEnabled = s.createMemo(
        () => modules.debugger || modules.locatorKeyPressSignal()
    )
    const dgraphEnabled = s.createMemo(
        () => modules.dgraph && debuggerEnabled()
    )
    // locator is enabled if debugger is enabled, and user pressed the key to activate it, or the plugin activated it
    const locatorEnabled = s.createMemo(
        () => (modules.locatorKeyPressSignal() || modules.locator) && debuggerEnabled(),
    )
    
    s.createEffect(defer(debuggerEnabled, enabled => {
        emitOutput('DebuggerEnabled', enabled)
    }))
    
    //
    // Current Open VIEW (currently not used)
    //
    let currentView: DevtoolsMainView = DEFAULT_MAIN_VIEW
    
    //
    // Enabled Modules
    //
    function toggleModule(data: InputChannels['ToggleModule']): void {
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
    } as const satisfies OutputChannels['InspectedState']
    
    const [inspectedState, setInspectedState] = s.createSignal<
        OutputChannels['InspectedState']
    >(INITIAL_INSPECTED_STATE, {equals: false})
    const inspectedOwnerId = s.createMemo(() => inspectedState().ownerId)
    
    s.createEffect(() => {
        emitOutput('InspectedState', inspectedState())
    })
    
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
    
    function setInspectedNode(data: InputChannels['InspectNode']): void {
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
    let node_updates_ids: NodeID[] = []
    let node_updates_timeout = 0
    
    function pushNodeUpdate(id: NodeID) {
        
        node_updates_ids.push(id)
        
        if (node_updates_timeout === 0) {
            node_updates_timeout = window.setTimeout(() => {
                emitOutput('NodeUpdates', node_updates_ids)
                node_updates_ids = []
                node_updates_timeout = 0
            })
        }
    }
    
    //
    // Structure:
    //
    const structure = createStructure({
        onStructureUpdate(updates) {
            emitOutput('StructureUpdates', updates)
            updateInspectedNode()
        },
        onNodeUpdate: pushNodeUpdate,
        enabled: debuggerEnabled,
    })
    
    //
    // Inspected Owner details:
    //
    const inspector = createInspector({
        enabled:            debuggerEnabled,
        inspectedOwnerId:   inspectedOwnerId,
        resetInspectedNode: resetInspectedNode,
        emit:               emitOutput,
    })
    
    //
    // Dependency Graph
    //
    const dgraph = createDependencyGraph({
        enabled:        dgraphEnabled,
        onNodeUpdate:   pushNodeUpdate,
        inspectedState: inspectedState,
        emit:           emitOutput,
    })
    
    //
    // Locator
    //
    const locator = createLocator({
        locatorEnabled,
        setLocatorEnabledSignal(signal) {
            toggleModules('locatorKeyPressSignal', () => signal)
        },
        onComponentClick(componentId, next) {
            if (modules.debugger) {
                emitOutput('InspectedComponent', componentId)
            } else {
                next()
            }
        },
        emit: emitOutput,
    })
    
    // Opens the source code of the inspected component
    function openInspectedNodeLocation() {
        const details = inspector.getLastDetails()
        details?.location && locator.openElementSourceCode(details.location, details.name)
    }
    
    // send the state of the client locator mode
    s.createEffect(defer(modules.locatorKeyPressSignal, state => {
        emitOutput('LocatorModeChange', state)
    }))
    
    function emitInputObj(e: InputMessage) {
    
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
            locator.setDevtoolsHighlightTarget(e.details)
            break
        case 'InspectNode':
            setInspectedNode(e.details)
            break
        case 'InspectValue':
            inspector.toggleValueNode(e.details)
            break
        case 'ConsoleInspectValue':
            inspector.consoleLogValue(e.details)
            break
        case 'OpenLocation':
            openInspectedNodeLocation()
            break
        case 'TreeViewModeChange':
            structure.setTreeWalkerMode(e.details)
            break
        case 'ViewChange':
            currentView = e.details
            structure.onViewChange(currentView)
            dgraph.onViewChange(currentView)
            break
        case 'ToggleModule':
            toggleModule(e.details)
            break
        }
    }
    function emitInput<K extends keyof InputChannels>(name: K, details: InputChannels[K]) {
        emitInputObj({name, details} as any)
    }

    return {
        versions:          setup.versions,
        enabled:           debuggerEnabled,
        listen:            listen,
        emit:              emitInput,
        emitObj:           emitInputObj,
        setLocatorOptions: locator.useLocator,
        toggleEnabled(enabled: boolean) {
            toggleModules('debugger', enabled)
        },
    }
}

let _debugger_instance: ReturnType<typeof createDebugger> | undefined

/**
 * Used for connecting debugger to devtools
 */
export function useDebugger() {
    _debugger_instance ??= createDebugger()
    return _debugger_instance
}
