import {SECOND} from '@solid-primitives/date'
import {createEventBus} from '@solid-primitives/event-bus'
import {debounce} from '@solid-primitives/scheduled'
import {defer} from '@solid-primitives/utils'
import {type Debugger, DebuggerModule, DevtoolsMainView, type NodeID} from '@solid-devtools/debugger/types'
import {mutate_remove} from '@solid-devtools/shared/utils'
import * as s from 'solid-js'
import {App} from './App.tsx'
import createInspector from './inspector.tsx'
import {type Structure} from './structure.tsx'
import * as ui from './ui/index.ts'


export type InputMessage = {
    [K in keyof Debugger.OutputChannels]: {
        name:    K,
        details: Debugger.OutputChannels[K],
    }
}[keyof Debugger.OutputChannels]
export type InputListener = (e: InputMessage) => void

export type InputEventBus = {
    emit:   (e: InputMessage) => void,
    listen: (fn: InputListener) => void,
}

export type OutputMessage = {
    [K in keyof Debugger.InputChannels]: {
        name:    K,
        details: Debugger.InputChannels[K],
    }
}[keyof Debugger.InputChannels]
export type OutputListener = (e: OutputMessage) => void

export type OutputEventBus = {
    emit:   (e: OutputMessage) => void,
    listen: (fn: OutputListener) => void,
}


/**
 * devtools options provided to {@link Devtools} component
 * with their default values
 */
export type DevtoolsOptionsWithDefaults = {
    errorOverlayFooter: () => s.JSX.Element
    headerSubtitle:     () => s.JSX.Element
    useShortcuts:       boolean
    catchWindowErrors:  boolean
}

export type DevtoolsOptions = Partial<DevtoolsOptionsWithDefaults>

export function createDevtools(props: DevtoolsOptions) {

    let output_listeners: OutputListener[] = []
    const output: OutputEventBus = {
        listen(listener) {
            output_listeners.push(listener)
            s.onCleanup(() => {
                mutate_remove(output_listeners, listener)
            })
        },
        emit(e) {
            s.batch(() => {
                for (let fn of output_listeners) {
                    fn(e)
                }
            })
        },
    }

    let input_listeners: InputListener[] = []
    const input: InputEventBus = {
        listen(listener) {
            input_listeners.push(listener)
            s.onCleanup(() => {
                mutate_remove(input_listeners, listener)
            })
        },
        emit(e) {
            s.batch(() => {
                for (let fn of input_listeners) {
                    fn(e)
                }
            })
        },
    }

    let options: DevtoolsOptionsWithDefaults = {
        errorOverlayFooter: props.errorOverlayFooter ?? (() => null),
        headerSubtitle:     props.headerSubtitle     ?? (() => null),
        useShortcuts:       props.useShortcuts       ?? false,
        catchWindowErrors:  props.catchWindowErrors  ?? false,
    }

    const controller = createController(output, input, options)

    return {
        output,
        input,
        Devtools() {
            return (
                <div class={ui.devtools_root_class + ' h-inherit'}>
                    <ui.Styles />
                    <ui.ErrorOverlay
                        footer={options.errorOverlayFooter()}
                        catchWindowErrors={options.catchWindowErrors}
                    >
                        <ControllerCtx.Provider value={controller}>
                            <App headerSubtitle={options.headerSubtitle()} />
                        </ControllerCtx.Provider>
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

function createController(
    output:  OutputEventBus,
    input:   InputEventBus,
    options: DevtoolsOptions,
) {
    //
    // LOCATOR
    //
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = s.createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = s.createSignal(false)
    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    // send devtools locator state
    s.createEffect(defer(devtoolsLocatorEnabled, enabled => {
        output.emit({
            name:    'ToggleModule',
            details: {module: DebuggerModule.Locator, enabled}
        })
    }))

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
    s.createEffect(defer(extHoveredNode, node => {
        output.emit({
            name:    'HighlightElementChange',
            details: node,
        })
    }))

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

    s.createEffect(defer(openedView, view => {
        output.emit({name: 'ViewChange', details: view})
    }))

    //
    // Node updates - signals and computations updating
    //
    const nodeUpdates = createEventBus<NodeID>()

    //
    // INSPECTOR
    //
    const inspector = createInspector(output, input)

    //
    // Client events
    //
    input.listen(e => {
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
        output,
        input,
        viewCache,
        listenToNodeUpdate(id: NodeID, fn: VoidFunction) {
            return nodeUpdates.listen(updatedId => updatedId === id && fn())
        },
    }
}

export type Controller = ReturnType<typeof createController>

const ControllerCtx = s.createContext<Controller>('ControllerCtx' as any as Controller)

export const useController = () => s.useContext(ControllerCtx)
