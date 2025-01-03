import * as s from 'solid-js'
import {SECOND} from '@solid-primitives/date'
import {createEventBus} from '@solid-primitives/event-bus'
import {debounce} from '@solid-primitives/scheduled'
import {defer} from '@solid-primitives/utils'
import * as debug from '@solid-devtools/debugger/types'
import {msg, mutate_remove} from '@solid-devtools/shared/utils'
import {App} from './App.tsx'
import createInspector from './inspector.tsx'
import * as structure from './structure.tsx'
import * as ui from './ui/index.ts'


export type InputMessage   = debug.OutputMessage
export type InputListener  = debug.OutputListener
export type OutputMessage  = debug.InputMessage
export type OutputListener = debug.InputListener

export type InputEventBus = {
    emit:   (e: InputMessage) => void,
    listen: (fn: InputListener) => void,
}
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

    const ctx = createAppCtx(props)

    return {
        output: ctx.output,
        input:  ctx.input,
        Devtools() {
            return (
                <div class={ui.devtools_root_class + ' h-inherit'}>
                    <ui.Styles />
                    <ui.ErrorOverlay
                        footer={ctx.options.errorOverlayFooter()}
                        catchWindowErrors={ctx.options.catchWindowErrors}
                    >
                        <AppCtx.Provider value={ctx}>
                            <App headerSubtitle={ctx.options.headerSubtitle()} />
                        </AppCtx.Provider>
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
        [debug.DevtoolsMainView.Structure]: structure.Cache
    }
    let shortCache: null | any = null
    let nextShortCache: typeof shortCache = null
    const longCache = new Map<keyof CacheDataMap, any>()

    const clearShortCache = debounce(() => {
        shortCache = null
        nextShortCache = null
    }, 3 * SECOND)

    function setCacheGetter<T extends debug.DevtoolsMainView>(view: T, getter: () => CacheDataMap[T]) {
        s.onCleanup(() => {
            const data = getter()
            nextShortCache = {view: view as any, data: data.short}
            longCache.set(view, data.long)
            clearShortCache()
        })
    }
    function getCache<T extends debug.DevtoolsMainView>(
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

function createAppCtx(props: DevtoolsOptions) {

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

    //
    // LOCATOR
    //
    const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = s.createSignal(false)
    const [clientLocatorEnabled, setClientLocator] = s.createSignal(false)
    const locatorEnabled = () => devtoolsLocatorEnabled() || clientLocatorEnabled()

    // send devtools locator state
    s.createEffect(defer(devtoolsLocatorEnabled, enabled => {
        output.emit({
            kind: 'ToggleModule',
            data: {module: debug.DebuggerModule.Locator, enabled}
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
    const [clientHoveredNode, setClientHoveredNode] = s.createSignal<debug.NodeID | null>(null)
    const [extHoveredNode, setExtHoveredNode] = s.createSignal<{
        type: 'element' | 'node'
        id: debug.NodeID
    } | null>(null, {equals: (a, b) => a?.id === b?.id})

    // highlight hovered element
    s.createEffect(defer(extHoveredNode, node => {
        output.emit({
            kind: 'HighlightElementChange',
            data: node,
        })
    }))

    const hoveredId = s.createMemo(() => {
        const extNode = extHoveredNode()
        return extNode ? extNode.id : clientHoveredNode()
    })
    const isNodeHovered = s.createSelector<debug.NodeID | null, debug.NodeID>(hoveredId)

    function toggleHoveredNode(id: debug.NodeID, type: 'element' | 'node' = 'node', isHovered?: boolean) {
        return setExtHoveredNode(p =>
            p && p.id === id ? (isHovered ? p : null) : isHovered ? {id, type} : p,
        )
    }
    function toggleHoveredElement(id: debug.NodeID, isHovered?: boolean) {
        return toggleHoveredNode(id, 'element', isHovered)
    }

    //
    // OPENED MAIN VIEW
    //
    // * there is no need for different views now

    const [openedView, setOpenedView] = s.createSignal<debug.DevtoolsMainView>(debug.DevtoolsMainView.Structure)
    const viewCache = createViewCache()

    function openView(view: debug.DevtoolsMainView) {
        setOpenedView(view)
    }

    s.createEffect(defer(openedView, view => {
        output.emit(msg('ViewChange', view))
    }))

    //
    // Node updates - signals and computations updating
    //
    const nodeUpdates = createEventBus<debug.NodeID>()

    //
    // INSPECTOR
    //
    const inspector = createInspector(output, input)

    //
    // Client events
    //
    input.listen(e => {
        switch (e.kind) {
        case 'NodeUpdates':
            for (let id of e.data) {
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
                return e.data.state
                    ? e.data.nodeId
                    : p && p === e.data.nodeId ? null : p
            })
            break
        case 'InspectedComponent':
            inspector.setInspectedOwner(e.data)
            setDevtoolsLocatorState(false)
            break
        case 'LocatorModeChange':
            setClientLocatorState(e.data)
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
        listenToNodeUpdate(id: debug.NodeID, fn: VoidFunction) {
            return nodeUpdates.listen(updatedId => updatedId === id && fn())
        },
    }
}

export type AppCtx = ReturnType<typeof createAppCtx>

const AppCtx = s.createContext<AppCtx>('ControllerCtx' as any as AppCtx)

export const useAppCtx = () => s.useContext(AppCtx)
