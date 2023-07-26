import { Debugger, DebuggerModule, DevtoolsMainView, NodeID } from '@solid-devtools/debugger/types'
import { SECOND } from '@solid-primitives/date'
import { EventBus, batchEmits, createEventBus, createEventHub } from '@solid-primitives/event-bus'
import { debounce } from '@solid-primitives/scheduled'
import { defer } from '@solid-primitives/utils'
import {
    JSX,
    batch,
    createContext,
    createEffect,
    createMemo,
    createSelector,
    createSignal,
    onCleanup,
    useContext,
} from 'solid-js'
import { make_var_styles } from '../../../configs/theme'
import { App } from './App'
import createInspector from './modules/inspector'
import { value_node_styles } from './modules/inspector/value-node'
import { owner_path_styles, type Structure } from './modules/structure'
import { ErrorOverlay, styles } from './ui'
import { custom_scrollbar_styles } from './ui/components/scrollable'

// TODO: add to solid-primitives/event-bus
type ToEventBusChannels<T extends Record<string, any>> = {
    [K in keyof T]: EventBus<T[K]>
}

function createDebuggerBridge() {
    const output = createEventHub<ToEventBusChannels<Debugger.InputChannels>>($ => ({
        ResetState: $(),
        InspectNode: $(),
        InspectValue: $(),
        HighlightElementChange: $(),
        OpenLocation: $(),
        TreeViewModeChange: $(),
        ViewChange: $(),
        ToggleModule: $(),
    }))

    // Listener of the client events (from the debugger) will be called synchronously under `batch`
    // to make sure that the state is updated before the effect queue is flushed.
    const input = createEventHub<ToEventBusChannels<Debugger.OutputChannels>>($ => ({
        DebuggerEnabled: batchEmits($()),
        ResetPanel: batchEmits($()),
        InspectedState: batchEmits($()),
        InspectedNodeDetails: batchEmits($()),
        StructureUpdates: batchEmits($()),
        NodeUpdates: batchEmits($()),
        InspectorUpdate: batchEmits($()),
        LocatorModeChange: batchEmits($()),
        HoveredComponent: batchEmits($()),
        InspectedComponent: batchEmits($()),
        DgraphUpdate: batchEmits($()),
    }))

    return { input, output }
}

export type DebuggerBridge = ReturnType<typeof createDebuggerBridge>

export type DevtoolsProps = {
    errorOverlayFooter?: JSX.Element
    headerSubtitle?: JSX.Element
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

const DevtoolsOptionsCtx = createContext<DevtoolsOptions>(
    'DevtoolsOptionsCtx' as any as DevtoolsOptions,
)

export const useDevtoolsOptions = () => useContext(DevtoolsOptionsCtx)

export function devtoolsPropsToOptions(props: DevtoolsProps): DevtoolsOptions {
    return {
        useShortcuts: props.useShortcuts ?? false,
    }
}

const devtools_root_class = 'devtools-root'
const var_styles = make_var_styles(devtools_root_class)

export function createDevtools() {
    const bridge = createDebuggerBridge()

    return {
        bridge,
        Devtools(props: DevtoolsProps) {
            const options = devtoolsPropsToOptions(props)

            const controller = createController(bridge, options)

            return (
                <div class={devtools_root_class + ' h-inherit'}>
                    <style>
                        {var_styles}
                        {styles.toggle_button_styles}
                        {styles.highlight_styles}
                        {owner_path_styles}
                        {value_node_styles}
                        {styles.tag_brackets_styles}
                        {custom_scrollbar_styles}
                    </style>
                    <ErrorOverlay
                        footer={props.errorOverlayFooter}
                        catchWindowErrors={props.catchWindowErrors}
                    >
                        <DevtoolsOptionsCtx.Provider value={options}>
                            <ControllerCtx.Provider value={controller}>
                                <App headerSubtitle={props.headerSubtitle} />
                            </ControllerCtx.Provider>
                        </DevtoolsOptionsCtx.Provider>
                    </ErrorOverlay>
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
        onCleanup(() => {
            const data = getter()
            nextShortCache = { view: view as any, data: data.short }
            longCache.set(view, data.long)
            clearShortCache()
        })
    }
    function getCache<T extends DevtoolsMainView>(
        view: T,
    ): { [K in 'short' | 'long']: CacheDataMap[T][K] | null } {
        const short = shortCache && shortCache.view === view ? shortCache.data : null
        shortCache = nextShortCache
        nextShortCache = null
        const long = longCache.get(view)
        longCache.delete(view)
        return { short, long }
    }

    return { set: setCacheGetter, get: getCache }
}

function createController(bridge: DebuggerBridge, options: DevtoolsOptions) {
    //
    // LOCATOR
    //
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = createSignal(false)
    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    // send devtools locator state
    createEffect(
        defer(devtoolsLocatorEnabled, enabled =>
            bridge.output.ToggleModule.emit({ module: DebuggerModule.Locator, enabled }),
        ),
    )

    function setClientLocatorState(enabled: boolean) {
        batch(() => {
            setClientLocator(enabled)
            if (!enabled) setClientHoveredNode(null)
        })
    }

    //
    // HOVERED NODE
    //
    const [clientHoveredNode, setClientHoveredNode] = createSignal<NodeID | null>(null)
    const [extHoveredNode, setExtHoveredNode] = createSignal<{
        type: 'element' | 'node'
        id: NodeID
    } | null>(null, { equals: (a, b) => a?.id === b?.id })

    // highlight hovered element
    createEffect(defer(extHoveredNode, bridge.output.HighlightElementChange.emit))

    const hoveredId = createMemo(() => {
        const extNode = extHoveredNode()
        return extNode ? extNode.id : clientHoveredNode()
    })
    const isNodeHovered = createSelector<NodeID | null, NodeID>(hoveredId)

    function toggleHoveredNode(id: NodeID, type: 'element' | 'node' = 'node', isHovered?: boolean) {
        return setExtHoveredNode(p =>
            p && p.id === id ? (isHovered ? p : null) : isHovered ? { id, type } : p,
        )
    }
    function toggleHoveredElement(id: NodeID, isHovered?: boolean) {
        return toggleHoveredNode(id, 'element', isHovered)
    }

    //
    // OPENED MAIN VIEW
    //
    // * there is no need for different views now

    const [openedView, setOpenedView] = createSignal<DevtoolsMainView>(DevtoolsMainView.Structure)
    const viewCache = createViewCache()

    function openView(view: DevtoolsMainView) {
        setOpenedView(view)
    }

    createEffect(defer(openedView, bridge.output.ViewChange.emit))

    //
    // Node updates - signals and computations updating
    //
    const nodeUpdates = createEventBus<NodeID>()
    bridge.input.NodeUpdates.listen(updated => updated.forEach(id => nodeUpdates.emit(id)))

    //
    // INSPECTOR
    //
    const inspector = createInspector({ bridge })

    //
    // Client events
    //
    bridge.input.ResetPanel.listen(() => {
        setClientLocatorState(false)
        setDevtoolsLocatorState(false)
        inspector.setInspectedOwner(null)
    })

    bridge.input.HoveredComponent.listen(({ nodeId, state }) => {
        setClientHoveredNode(p => (state ? nodeId : p && p === nodeId ? null : p))
    })

    bridge.input.InspectedComponent.listen(node => {
        inspector.setInspectedOwner(node)
        setDevtoolsLocatorState(false)
    })

    bridge.input.LocatorModeChange.listen(setClientLocatorState)

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
        listenToNodeUpdates: nodeUpdates.listen,
        listenToNodeUpdate(id: NodeID, fn: VoidFunction) {
            return nodeUpdates.listen(updatedId => updatedId === id && fn())
        },
    }
}

export type Controller = ReturnType<typeof createController>

const ControllerCtx = createContext<Controller>('ControllerCtx' as any as Controller)

export const useController = () => useContext(ControllerCtx)
