import {SECOND} from '@solid-primitives/date'
import {type EventBus, createEventBus, createEventHub} from '@solid-primitives/event-bus'
import {debounce} from '@solid-primitives/scheduled'
import {defer} from '@solid-primitives/utils'
import {type Debugger, DebuggerModule, DevtoolsMainView, type NodeID} from '@solid-devtools/debugger/types'
import {mutate_remove} from '@solid-devtools/shared/utils'
import * as s from 'solid-js'
import {App} from './App.tsx'
import createInspector from './inspector.tsx'
import {type Structure} from './structure.tsx'
import * as ui from './ui/index.ts'

// TODO: add to solid-primitives/event-bus
type ToEventBusChannels<T extends Record<string, any>> = {
    [K in keyof T]: EventBus<T[K]>
}

export type InputMessage = {
    [K in keyof Debugger.OutputChannels]: {
        name:    K,
        details: Debugger.OutputChannels[K],
    }
}[keyof Debugger.OutputChannels]
export type InputListener = (e: InputMessage) => void

function createDebuggerBridge() {
    
    const output = createEventHub<ToEventBusChannels<Debugger.InputChannels>>($ => ({
        ResetState:             $(),
        InspectNode:            $(),
        InspectValue:           $(),
        HighlightElementChange: $(),
        OpenLocation:           $(),
        TreeViewModeChange:     $(),
        ViewChange:             $(),
        ToggleModule:           $(),
    }))

    let input_listeners: InputListener[] = []
    const input = {
        listen(listener: InputListener) {
            input_listeners.push(listener)
            s.onCleanup(() => {
                mutate_remove(input_listeners, listener)
            })
        },
        emit(e: InputMessage) {
            s.batch(() => {
                for (let fn of input_listeners) {
                    fn(e)
                }
            })
        },
    }

    return {input, output}
}

export type DebuggerBridge = ReturnType<typeof createDebuggerBridge>

export type DevtoolsProps = {
    errorOverlayFooter?: s.JSX.Element
    headerSubtitle?: s.JSX.Element
    useShortcuts?: boolean
    catchWindowErrors?: boolean
}

/**
 * devtools options provided to {@link Devtools} component
 * with their default values
 */
export type DevtoolsOptions = {
    useShortcuts: boolean
}

const DevtoolsOptionsCtx = s.createContext<DevtoolsOptions>(
    'DevtoolsOptionsCtx' as any as DevtoolsOptions,
)

export const useDevtoolsOptions = () => s.useContext(DevtoolsOptionsCtx)

export function devtoolsPropsToOptions(props: DevtoolsProps): DevtoolsOptions {
    return {
        useShortcuts: props.useShortcuts ?? false,
    }
}

export function createDevtools() {
    const bridge = createDebuggerBridge()

    return {
        bridge,
        Devtools(props: DevtoolsProps) {
            const options = devtoolsPropsToOptions(props)

            const controller = createController(bridge, options)

            return (
                <div class={ui.devtools_root_class + ' h-inherit'}>
                    <ui.Styles />
                    <ui.ErrorOverlay
                        footer={props.errorOverlayFooter}
                        catchWindowErrors={props.catchWindowErrors}
                    >
                        <DevtoolsOptionsCtx.Provider value={options}>
                            <ControllerCtx.Provider value={controller}>
                                <App headerSubtitle={props.headerSubtitle} />
                            </ControllerCtx.Provider>
                        </DevtoolsOptionsCtx.Provider>
                    </ui.ErrorOverlay>
                </div>
            )
        },
    }
}

/**
 * Views when disposed can cache their state to be restored when opened again.
 * The short cache is cleared after 3 seconds of inactivity.
 * The long cache is cleared when the view is opened again.
 */
function createViewCache() {
    type CacheDataMap = {
        [DevtoolsMainView.Structure]: Structure.Cache
    }
    let shortCache: null | any = null
    let nextShortCache: typeof shortCache = null
    const longCache = new Map<keyof CacheDataMap, any>()

    const clearShortCache = debounce(() => {
        shortCache = null
        nextShortCache = null
    }, 3 * SECOND)

    function setCacheGetter<T extends DevtoolsMainView>(view: T, getter: () => CacheDataMap[T]) {
        s.onCleanup(() => {
            const data = getter()
            nextShortCache = {view: view as any, data: data.short}
            longCache.set(view, data.long)
            clearShortCache()
        })
    }
    function getCache<T extends DevtoolsMainView>(
        view: T,
    ): {[K in 'short' | 'long']: CacheDataMap[T][K] | null} {
        const short = shortCache && shortCache.view === view ? shortCache.data : null
        shortCache = nextShortCache
        nextShortCache = null
        const long = longCache.get(view)
        longCache.delete(view)
        return {short, long}
    }

    return {set: setCacheGetter, get: getCache}
}

function createController(bridge: DebuggerBridge, options: DevtoolsOptions) {
    //
    // LOCATOR
    //
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = s.createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = s.createSignal(false)
    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    // send devtools locator state
    s.createEffect(defer(devtoolsLocatorEnabled, enabled =>
        bridge.output.ToggleModule.emit({module: DebuggerModule.Locator, enabled}),
    ))

    function setClientLocatorState(enabled: boolean) {
        s.batch(() => {
            setClientLocator(enabled)
            if (!enabled) setClientHoveredNode(null)
        })
    }

    //
    // HOVERED NODE
    //
    const [clientHoveredNode, setClientHoveredNode] = s.createSignal<NodeID | null>(null)
    const [extHoveredNode, setExtHoveredNode] = s.createSignal<{
        type: 'element' | 'node'
        id: NodeID
    } | null>(null, {equals: (a, b) => a?.id === b?.id})

    // highlight hovered element
    s.createEffect(defer(extHoveredNode, bridge.output.HighlightElementChange.emit))

    const hoveredId = s.createMemo(() => {
        const extNode = extHoveredNode()
        return extNode ? extNode.id : clientHoveredNode()
    })
    const isNodeHovered = s.createSelector<NodeID | null, NodeID>(hoveredId)

    function toggleHoveredNode(id: NodeID, type: 'element' | 'node' = 'node', isHovered?: boolean) {
        return setExtHoveredNode(p =>
            p && p.id === id ? (isHovered ? p : null) : isHovered ? {id, type} : p,
        )
    }
    function toggleHoveredElement(id: NodeID, isHovered?: boolean) {
        return toggleHoveredNode(id, 'element', isHovered)
    }

    //
    // OPENED MAIN VIEW
    //
    // * there is no need for different views now

    const [openedView, setOpenedView] = s.createSignal<DevtoolsMainView>(DevtoolsMainView.Structure)
    const viewCache = createViewCache()

    function openView(view: DevtoolsMainView) {
        setOpenedView(view)
    }

    s.createEffect(defer(openedView, bridge.output.ViewChange.emit))

    //
    // Node updates - signals and computations updating
    //
    const nodeUpdates = createEventBus<NodeID>()

    //
    // INSPECTOR
    //
    const inspector = createInspector({bridge})

    //
    // Client events
    //
    bridge.input.listen(e => {
        switch (e.name) {
        case 'NodeUpdates':
            for (let id of e.details) {
                nodeUpdates.emit(id)
            }
            break
        case 'ResetPanel':
            setClientLocatorState(false)
            setDevtoolsLocatorState(false)
            inspector.setInspectedOwner(null)
            break
        case 'HoveredComponent':
            setClientHoveredNode(p => {
                return e.details.state
                    ? e.details.nodeId
                    : p && p === e.details.nodeId ? null : p
            })
            break
        case 'InspectedComponent':
            inspector.setInspectedOwner(e.details)
            setDevtoolsLocatorState(false)
            break
        case 'LocatorModeChange':
            setClientLocatorState(e.details)
            break
        case 'DebuggerEnabled':
        case 'InspectedState':
        case 'InspectedNodeDetails':
        case 'StructureUpdates':
        case 'InspectorUpdate':
        case 'DgraphUpdate':
            // handled elsewhere for now
            break
        }
    })

    return {
        locator: {
            locatorEnabled,
            setLocatorState: setDevtoolsLocatorState,
        },
        hovered: {
            isNodeHovered,
            hoveredId,
            toggleHoveredNode,
            toggleHoveredElement,
        },
        view: {
            get: openedView,
            set: openView,
        },
        inspector,
        options,
        bridge,
        viewCache,
        listenToNodeUpdate(id: NodeID, fn: VoidFunction) {
            return nodeUpdates.listen(updatedId => updatedId === id && fn())
        },
    }
}

export type Controller = ReturnType<typeof createController>

const ControllerCtx = s.createContext<Controller>('ControllerCtx' as any as Controller)

export const useController = () => s.useContext(ControllerCtx)
