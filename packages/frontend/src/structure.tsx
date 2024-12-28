import * as s from 'solid-js'
import {defer, entries} from '@solid-primitives/utils'
import {makeEventListener} from '@solid-primitives/event-listener'
import {createShortcut} from '@solid-primitives/keyboard'
import {createElementSize, createResizeObserver} from '@solid-primitives/resize-observer'
import {useRemSize} from '@solid-primitives/styles'

import {type Atom, atom, createHover} from '@solid-devtools/shared/primitives'
import * as theme from '@solid-devtools/shared/theme'
import * as debug from '@solid-devtools/debugger/types'
import {hover_background, panel_header_el_border} from './SidePanel.tsx'
import {useController, useDevtoolsOptions} from './controller.tsx'
import * as ui from './ui/index.ts'


export namespace Structure {
    export interface Node {
        id:       debug.NodeID
        name?:    string
        type:     debug.NodeType
        level:    number
        parent:   Node | null
        children: Node[]
        hmr?:     true
        frozen?:  true
    }

    export interface Root extends Node {
        name?: undefined
        frozen?: undefined
        type: debug.NodeType.Root
    }

    export type State = {roots: Node[]; nodeList: Node[]}

    // State to be stored in the controller cache
    export type Cache = {short: State; long: {mode: debug.TreeWalkerMode}}

    export type Module = ReturnType<typeof createStructure>
}

/**
 * Finds the top-root node
 */
export function getRootNode(node: Structure.Node): Structure.Node {
    let current: Structure.Node | null = node
    let lastRoot: Structure.Node | undefined
    while (current) {
        if (current.type === debug.NodeType.Root) lastRoot = current
        current = current.parent
    }
    if (lastRoot) return lastRoot
    throw new Error('Parent root not found')
}

export function getClosestComponentNode(node: Structure.Node): Structure.Node | undefined {
    let current: Structure.Node | null = node
    while (current) {
        if (current.type === debug.NodeType.Component) return current
        current = current.parent
    }
}

export function getNodePath(node: Structure.Node): Structure.Node[] {
    const path = [node]
    let parent = node.parent
    while (parent) {
        path.unshift(parent)
        parent = parent.parent
    }
    return path
}

export function createStructure() {
    const ctx = useController()
    const {inspector, bridge} = ctx
    const cachedInitialState = ctx.viewCache.get(debug.DevtoolsMainView.Structure)

    const [mode, setMode] = s.createSignal<debug.TreeWalkerMode>(
        cachedInitialState.long?.mode ?? debug.DEFAULT_WALKER_MODE,
    )

    function changeTreeViewMode(newMode: debug.TreeWalkerMode): void {
        if (newMode === mode()) return
        s.batch(() => {
            setMode(newMode)
            search('')
        })
    }

    const [state, setState] = s.createSignal<Structure.State>(
        cachedInitialState.short || {nodeList: [], roots: []},
    )
    ctx.viewCache.set(debug.DevtoolsMainView.Structure, () => ({
        short: state(),
        long: {mode: mode()},
    }))

    const inspectedNode = s.createMemo(() => {
        const id = inspector.inspected.treeWalkerOwnerId
        return id ? findNode(id) : null
    })

    function updateStructure(update: debug.StructureUpdates | null): void {
        setState(prev =>
            update ? reconcileStructure(prev.roots, update) : {nodeList: [], roots: []},
        )
    }

    function findNode(id: debug.NodeID): Structure.Node | undefined {
        for (const node of state().nodeList) {
            if (node.id === id) return node
        }
    }

    const [searchResult, setSearchResult] = s.createSignal<debug.NodeID[]>()
    const isSearched = s.createSelector(searchResult, (node: debug.NodeID, o) => !!o && o.includes(node))

    function searchNodeList(query: string): debug.NodeID[] | undefined {
        if (!query) return setSearchResult()
        return s.untrack(() => {
            const result: debug.NodeID[] = []
            const rgx = new RegExp('^' + query, 'i')
            for (const node of state().nodeList) {
                if (node.type !== debug.NodeType.Element && node.name && node.name.match(rgx))
                    result.push(node.id)
            }
            return setSearchResult(result.length ? result : undefined)
        })
    }

    // SEARCH NODES
    let lastSearch: string = ''
    let lastSearchResults: debug.NodeID[] | undefined
    let lastSearchIndex = 0
    function search(query: string): void {
        if (query === lastSearch) {
            if (lastSearchResults) {
                lastSearchIndex = (lastSearchIndex + 1) % lastSearchResults.length
                inspector.setInspectedOwner(lastSearchResults[lastSearchIndex]!)
            }
            return
        } else {
            lastSearch = query
            const result = searchNodeList(query)
            if (result) inspector.setInspectedOwner(result[(lastSearchIndex = 0)]!)
            lastSearchResults = result
        }
    }

    //
    // Listen to Client Events
    //
    bridge.input.ResetPanel.listen(() => {
        updateStructure(null)
    })

    bridge.input.StructureUpdates.listen(updateStructure)

    // TREE VIEW MODE
    s.createEffect(defer(mode, bridge.output.TreeViewModeChange.emit))

    return {
        state,
        inspectedNode,
        updateStructure,
        isSearched,
        findNode,
        getRootNode,
        getClosestComponentNode,
        getNodePath,
        search,
        changeTreeViewMode,
        mode,
        setMode,
    }
}

let Updated: debug.StructureUpdates['updated']
let NewNodeList: Structure.Node[]

function createNode(
    raw: debug.Mapped.Owner,
    parent: Structure.Node | null,
    level: number,
): Structure.Node {
    const {id, name, type, children: rawChildren} = raw

    const children: Structure.Node[] = []
    const node: Structure.Node = {id, type, children, parent, level}

    if (name) node.name = name
    if (type === debug.NodeType.Component && raw.hmr) node.hmr = raw.hmr
    else if (type !== debug.NodeType.Root && raw.frozen) node.frozen = true

    NewNodeList.push(node)

    // map children
    for (const child of rawChildren) children.push(createNode(child, node, level + 1))

    return node
}

function updateNode(
    node: Structure.Node,
    rootId: debug.NodeID,
    raw: debug.Mapped.Owner | undefined,
    level: number,
): Structure.Node {
    const {id, children} = node
    NewNodeList.push(node)
    node.level = level

    if (!raw) raw = Updated[rootId]?.[id]

    if (raw) {
        // update frozen computations
        if ('frozen' in raw && raw.frozen) node.frozen = true

        const {children: rawChildren} = raw
        const newChildren: Structure.Node[] = (node.children = [])

        if (rawChildren.length) {
            const prevChildrenMap: Record<debug.NodeID, Structure.Node> = {}
            for (const child of children) prevChildrenMap[child.id] = child

            for (const childRaw of rawChildren) {
                const childNode = prevChildrenMap[childRaw.id]
                newChildren.push(
                    childNode
                        ? updateNode(childNode, rootId, childRaw, level + 1)
                        : createNode(childRaw, node, level + 1),
                )
            }
        }
    } else {
        for (const child of children) {
            updateNode(child, rootId, Updated[rootId]?.[child.id], level + 1)
        }
    }

    return node
}

export function reconcileStructure(
    prevRoots: Structure.Node[],
    {removed, updated, partial}: debug.StructureUpdates,
): Structure.State {
    Updated = updated
    NewNodeList = []
    const nextRoots: Structure.Node[] = []

    const upatedTopLevelRoots = new Set<debug.NodeID>()
    for (const root of prevRoots) {
        const {id} = root
        // skip removed roots for partial updates
        // and for full updates skip roots that were not sent
        if (partial ? removed.includes(id) : !(id in Updated)) continue
        upatedTopLevelRoots.add(id)
        nextRoots.push(updateNode(root, id, Updated[id]?.[id], 0))
    }

    for (const [rootId, updatedNodes] of entries(Updated)) {
        const root = updatedNodes![rootId]
        if (!root || upatedTopLevelRoots.has(rootId)) continue
        nextRoots.push(createNode(root, null, 0))
    }

    return {roots: nextRoots, nodeList: NewNodeList}
}

export const path_height = theme.spacing[4.5]
export const row_height = theme.spacing[4.5]
export const row_padding = theme.spacing[3.5]
export const v_margin = theme.spacing[3]

export const path_height_in_rem = theme.remValue(path_height)
export const row_height_in_rem = theme.remValue(row_height)
export const v_margin_in_rem = theme.remValue(v_margin)

export const path_height_class = 'h-owner-path-height'
export const path_min_height_class = 'min-h-owner-path-height'

export const owner_path_styles = /*css*/ `
    .${path_height_class} {
        height: ${path_height};
    }
    .${path_min_height_class} {
        min-height: ${path_height};
    }
`

export const row_padding_minus_px = `calc(${row_padding} - 0.95px)`
export const lines_color = theme.vars.panel[3]
export const background_gradient = `repeating-linear-gradient(to right, transparent, transparent ${row_padding_minus_px}, ${lines_color} ${row_padding_minus_px}, ${lines_color} ${row_padding})`
export const padding_mask = `linear-gradient(to right, rgba(0,0,0, 0.4), black ${theme.spacing[48]})`

export function getVirtualVars(
    listLength: number,
    scroll: number,
    containerHeight: number,
    rowHeight: number,
): {start: number; end: number; length: number} {
    let start = Math.floor(scroll / rowHeight)
    let length = Math.ceil(containerHeight / rowHeight + 1)
    let end = start + length
    if (end > listLength) {
        end = listLength
        start = end - length
        length = Math.min(length, listLength)
        if (start < 0) start = 0
    }
    return {start, end, length}
}

const StructureContext = s.createContext<Structure.Module>()

export function useStructure(): Structure.Module {
    const ctx = s.useContext(StructureContext)
    if (!ctx) throw new Error('Structure context not found')
    return ctx
}

export function StructureView(): s.JSXElement {
    const structure = createStructure()

    return (
        <StructureContext.Provider value={structure}>
            <div
                class="relative h-full w-full overflow-hidden grid"
                style={{
                    'grid-template-rows': `${theme.spacing.header_height} 1fr ${path_height}`,
                    'grid-template-columns': '100%',
                }}
            >
                <div class="relative flex items-stretch">
                    <div class={panel_header_el_border} />
                    <LocatorButton />
                    <Search />
                    <ToggleMode />
                </div>
                <DisplayStructureTree />
                <OwnerPath />
            </div>
        </StructureContext.Provider>
    )
}

const LocatorButton: s.Component = () => {
    const {locator} = useController()
    return (
        <ui.ToggleButton
            class="shrink-0 w-7 h-7"
            onInteract={locator.setLocatorState}
            selected={locator.locatorEnabled()}
            title="Select an element in the page to inspect it"
        >
            <ui.Icon.Select class="w-4 h-4" />
        </ui.ToggleButton>
    )
}

const Search: s.Component = () => {
    const options = useDevtoolsOptions()
    const structure = useStructure()

    const [value, setValue] = s.createSignal('')

    const handleChange = (v: string): void => {
        setValue(v)
        structure.search('')
    }

    const edge_container_base = 'edge-container-base absolute inset-y-1 center-child'
    const icon_base = 'w-3.5 h-3.5 color-disabled'

    return (
        <form
            class={`${hover_background} group b-x b-solid b-panel-2 grow relative overflow-hidden`}
            onSubmit={e => {
                e.preventDefault()
                structure.search(value())
            }}
            onReset={() => handleChange('')}
        >
            <style>{
                /*css*/ `
                    .edge-container-base {
                        height: calc(100% - ${theme.spacing[2]})
                    }
                `
            }</style>
            <input
                ref={input => {
                    if (options.useShortcuts) {
                        createShortcut(['/'], () => input.focus())
                        createShortcut(['Escape'], () => {
                            if (document.activeElement === input) input.blur()
                            if (input.value) handleChange((input.value = ''))
                        })
                    }
                }}
                class="w-full text-lg p-x-6 transition-padding leading-9 placeholder:text-disabled group-focus-within:p-l-2"
                style={{
                    height: theme.spacing.header_height,
                }}
                type="text"
                placeholder="Search"
                onInput={e => handleChange(e.currentTarget.value)}
                onPaste={e => handleChange(e.currentTarget.value)}
            />
            <div
                class={`${edge_container_base} pointer-events-none left-0 p-l-1.5 transition-transform group-focus-within:-translate-x-full`}
            >
                <ui.Icon.Search class={icon_base} />
            </div>
            {value() && (
                <button
                    class={`${hover_background} ${edge_container_base} right-1 p-x-.5 rounded`}
                    type="reset"
                >
                    <ui.Icon.Close class={icon_base} />
                </button>
            )}
        </form>
    )
}

const ToggleMode: s.Component = () => {
    const structure = useStructure()

    const tabsContentMap: Readonly<Record<debug.TreeWalkerMode, string>> = {
        [debug.TreeWalkerMode.Owners]: 'Owners',
        [debug.TreeWalkerMode.Components]: 'Components',
        [debug.TreeWalkerMode.DOM]: 'DOM',
    }

    return (
        <div class="ml-auto h-full">
            <ui.ToggleTabs
                class="h-full"
                active={structure.mode()}
                onSelect={structure.changeTreeViewMode}
            >
                {Option =>
                    [debug.TreeWalkerMode.Components, debug.TreeWalkerMode.Owners, debug.TreeWalkerMode.DOM].map(
                        mode => (
                            <Option
                                for={mode}
                                class="group"
                                style={{
                                    [ui.toggle_tab_color_var]:
                                        mode === debug.TreeWalkerMode.Owners
                                            ? theme.vars.text.DEFAULT
                                            : mode === debug.TreeWalkerMode.DOM
                                              ? theme.vars.dom
                                              : theme.vars.component,
                                }}
                            >
                                <div
                                    class="w-2 h-2 rounded-full border border-solid opacity-60 transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-[[aria-selected=true]]:opacity-100"
                                    style={{
                                        'border-color': `var(${ui.toggle_tab_color_var})`,
                                    }}
                                />
                                {tabsContentMap[mode]}
                            </Option>
                        ),
                    )
                }
            </ui.ToggleTabs>
        </div>
    )
}

const getFocusedNodeData = (
    list: Structure.Node[],
    start: number,
    end: number,
    index: number,
): [node: debug.NodeID, position: number] | undefined => {
    if (index < start || index > end) index = Math.floor(end - (end - start) / 1.618)
    let node = list[index]
    let move = 0
    while (node) {
        if (node.type === debug.NodeType.Component || node.type === debug.NodeType.Root)
            return [node.id, index - start]
        move = move <= 0 ? -move + 1 : -move
        node = list[(index += move)]
    }
}

const DisplayStructureTree: s.Component = () => {
    const [containerScroll, setContainerScroll] = s.createSignal({top: 0, height: 0})

    const remSize = useRemSize()
    const getContainerTopMargin = (): number => remSize() * v_margin_in_rem
    const getRowHeight = (): number => remSize() * row_height_in_rem

    const updateScrollData = (el: HTMLElement): void => {
        setContainerScroll({
            top: Math.max(el.scrollTop - getContainerTopMargin(), 0),
            height: el.clientHeight,
        })
    }

    const [collapsed, setCollapsed] = s.createSignal(new WeakSet<Structure.Node>(), {equals: false})

    const isCollapsed = (node: Structure.Node): boolean => collapsed().has(node)

    const toggleCollapsed = (node: Structure.Node): void => {
        setCollapsed(set => {
            set.delete(node) || set.add(node)
            return set
        })
    }

    const ctx = useController()
    const {inspector, hovered} = ctx
    const structure = useStructure()

    let lastVirtualStart = 0
    let lastVirtualEnd = 0
    let lastInspectedIndex = 0
    let lastFocusedNodeData: ReturnType<typeof getFocusedNodeData>

    s.createEffect(() => {
        ;({start: lastVirtualStart, end: lastVirtualEnd} = virtual())
        lastInspectedIndex = inspectedIndex()
    })

    const collapsedList = s.createMemo((prev: Structure.Node[] = []) => {
        // position of focused component needs to be calculated right before the collapsed list is recalculated
        // to be compated with it after the changes
        // `list data` has to be updated in an effect, so that this memo can run before it, instead of reading it here
        // because of solid's pull-based memo behavior (reading from a memo invalidates it, and it's dependencies)
        lastFocusedNodeData = getFocusedNodeData(
            prev,
            lastVirtualStart,
            lastVirtualEnd,
            lastInspectedIndex,
        )

        const all_nodes_list = structure.state().nodeList
        const collapsed_list: Structure.Node[] = []
        const set = collapsed()

        /*
            Go over the list of all nodes
            skip the ones that are in collapsed set
            by increasing the skip counter by the number of children
        */
        let skip_n = 0
        for (const node of all_nodes_list) {
            const is_skipped = skip_n > 0

            if (is_skipped) skip_n--
            else collapsed_list.push(node)

            if (is_skipped || set.has(node)) skip_n += node.children.length
        }

        return collapsed_list
    })

    const virtual = s.createMemo<{
        start: number
        end: number
        fullLength: number
        list: readonly Atom<Structure.Node>[]
        nodeList: readonly Structure.Node[]
        minLevel: number
    }>((prev = {start: 0, end: 0, fullLength: 0, list: [], nodeList: [], minLevel: 0}) => {
        const nodeList = collapsedList()
        const {top, height} = containerScroll()
        const {start, end, length} = getVirtualVars(nodeList.length, top, height, getRowHeight())

        if (prev.nodeList === nodeList && prev.start === start && prev.end === end) return prev

        const next: Atom<Structure.Node>[] = Array(length)
        const prevMap: Record<debug.NodeID, Atom<Structure.Node>> = {}
        for (const node of prev.list) prevMap[node.value.id] = node

        let minLevel = length ? Infinity : 0

        for (let i = 0; i < length; i++) {
            const node = nodeList[start + i]!
            const nodeAtom = prevMap[node.id]
            minLevel = Math.min(minLevel, node.level)

            if (nodeAtom) {
                next[i] = nodeAtom
                nodeAtom.set(node)
            } else {
                next[i] = atom(node)
            }
        }

        return {list: next, start, end, nodeList, fullLength: nodeList.length, minLevel}
    })

    const minLevel = s.createMemo(() => Math.max(virtual().minLevel - 7, 0), 0, {
        equals: (a, b) => a == b || (Math.abs(b - a) < 7 && b != 0),
    })

    // calculate node indexP in the collapsed list
    const getNodeIndexById = (id: debug.NodeID): number => {
        const nodeList = collapsedList()
        for (let i = 0; i < nodeList.length; i++) if (nodeList[i]!.id === id) return i
        return -1
    }

    // Index of the inspected node in the collapsed list
    const inspectedIndex = s.createMemo(() => {
        const id = inspector.inspected.treeWalkerOwnerId
        return id ? getNodeIndexById(id) : -1
    })

    // Seep the inspected or central node in view when the list is changing
    s.createEffect(
        defer(collapsedList, () => {
            if (!lastFocusedNodeData) return
            const [nodeId, lastPosition] = lastFocusedNodeData
            const index = getNodeIndexById(nodeId)
            if (index === -1) return
            const move = index - virtual().start - lastPosition
            if (move !== 0) container.scrollTop += move * getRowHeight()
        }),
    )

    // Scroll to selected node when it changes
    // listen to inspected ID, instead of node, because node reference can change
    s.createEffect(() => {
        if (!inspector.inspected.treeWalkerOwnerId) return
        // Run in next tick to ensure the scroll data is updated and virtual list recalculated
        // inspect node -> open inspector -> container changes height -> scroll data changes -> virtual list changes -> scroll to node
        setTimeout(() => {
            let index = inspectedIndex()
            if (index === -1) {
                const node = structure.inspectedNode()
                if (!node) return
                // Un-collapse parents if needed
                const set = collapsed()
                let parent = node.parent
                let wasCollapsed = false
                while (parent) {
                    wasCollapsed ||= set.delete(parent)
                    parent = parent.parent
                }
                if (wasCollapsed) {
                    setCollapsed(set)
                    index = inspectedIndex()
                } else return
            }

            const {start, end} = virtual()
            const rowHeight = getRowHeight()
            let top: number
            if (index <= start) top = (index - 1) * rowHeight
            else if (index >= end - 2) top = (index + 2) * rowHeight - containerScroll().height
            else return

            container.scrollTop = top + getContainerTopMargin()
        })
    })

    /*
        Keyboard navigation
    */
    if (ctx.options.useShortcuts) {
        makeEventListener(document.body, 'keydown', e => {
            if (e.target !== document.body) return

            const {key} = e

            if (
                key !== 'ArrowDown' &&
                key !== 'ArrowUp' &&
                key !== 'ArrowLeft' &&
                key !== 'ArrowRight'
            )
                return

            e.preventDefault()
            e.stopPropagation()

            const idx = inspectedIndex()
            const nodeList = virtual().nodeList

            switch (key) {
                case 'ArrowDown':
                case 'ArrowUp': {
                    const d = key === 'ArrowDown' ? 1 : -1
                    let i = idx === -1 ? (key === 'ArrowDown' ? 0 : nodeList.length - 1) : idx + d
                    while (i >= 0 && i < nodeList.length) {
                        const node = nodeList[i]!
                        i += d
                        if (node.type === debug.NodeType.Element) continue
                        inspector.setInspectedOwner(node.id)
                        break
                    }
                    break
                }

                case 'ArrowLeft': {
                    const node = nodeList[idx]!

                    if (!isCollapsed(node)) {
                        toggleCollapsed(node)
                        break
                    }

                    let parent = node.parent
                    while (parent) {
                        if (parent.type === debug.NodeType.Element) parent = parent.parent
                        else {
                            inspector.setInspectedOwner(parent.id)
                            break
                        }
                    }
                    break
                }

                case 'ArrowRight': {
                    const node = nodeList[idx]!

                    if (isCollapsed(node)) {
                        toggleCollapsed(node)
                        break
                    }

                    let child = node.children[0]
                    while (child) {
                        if (child.type === debug.NodeType.Element) child = child.children[0]
                        else {
                            inspector.setInspectedOwner(child.id)
                            break
                        }
                    }
                    break
                }
            }
        })
    }

    let container: HTMLElement
    return (
        <ui.Scrollable
            ref={el => {
                container = el
                setTimeout(() => updateScrollData(el))
                createResizeObserver(el, () => updateScrollData(el))
            }}
            onScroll={e => updateScrollData(e.currentTarget)}
        >
            <div
                class="box-content"
                style={{
                    padding: `${row_height} 0`,
                    height: `calc(${virtual().fullLength} * ${row_height})`,
                }}
            >
                <div
                    style={{
                        transform: `translateY(calc(${virtual().start} * ${row_height}))`,
                    }}
                >
                    <div
                        style={{
                            transition: 'margin-left 300ms',
                            'margin-left': `calc(${minLevel()} * -${row_padding})`,
                        }}
                    >
                        <s.For each={virtual().list}>
                            {node => {
                                const {id} = node.value
                                return (
                                    <OwnerNode
                                        owner={node.value}
                                        isHovered={
                                            hovered.isNodeHovered(id) || structure.isSearched(id)
                                        }
                                        isSelected={inspector.isInspectedTreeWalkerOwner(id)}
                                        listenToUpdate={listener =>
                                            ctx.listenToNodeUpdate(id, listener)
                                        }
                                        onHoverChange={state =>
                                            hovered.toggleHoveredNode(id, 'node', state)
                                        }
                                        onInspectChange={() => inspector.toggleInspectedOwner(id)}
                                        toggleCollapsed={toggleCollapsed}
                                        isCollapsed={isCollapsed(node.value)}
                                    />
                                )
                            }}
                        </s.For>
                    </div>
                </div>
            </div>
        </ui.Scrollable>
    )
}


export const OwnerPath: s.Component = () => {
    const {inspector, hovered} = useController()
    const structure = useStructure()

    let container!: HTMLDivElement
    const rem = useRemSize()
    const containerSize = createElementSize(() => container)
    const expandable = (): boolean => (containerSize.height ?? 0) > rem() * path_height_in_rem

    const path = s.createMemo(() => {
        const node = structure.inspectedNode()
        return node ? structure.getNodePath(node) : []
    })

    return (
        <div class={`relative w-full shrink-0 flex ${path_height_class}`}>
            <div
                class={`group
                absolute z-1 bottom-0 inset-x-0 w-full p-y-.25 p-x-2
                overflow-hidden box-border flex items-end
                bg-panel-bg b-t b-solid b-panel-border
                ${path_height_class} ${path_min_height_class}
                hover:h-auto hover:pt-.5`}
            >
                {expandable() && (
                    <div
                        class="absolute z-2 inset-0 p-l-3
                        flex items-center pointer-events-none
                        group-hover:opacity-0"
                        style={{
                            'background-image': `linear-gradient(to right, ${theme.vars.panel.bg} ${theme.spacing[8]}, transparent ${theme.spacing[32]})`,
                        }}
                    >
                        <ui.Icon.Options class="w-3 h3 text-disabled" />
                    </div>
                )}
                <div class="flex flex-wrap text-sm leading-3 font-mono" ref={container}>
                    {path().map(node => {

                        const hoverProps = createHover(hovering => {
                            hovered.toggleHoveredNode(node.id, 'node', hovering)
                        })

                        return <>
                            <div class="w-3 h-4 mx-.5 center-child first:hidden">
                                <ui.Icon.CarretRight class="w-2 h-2 mb-[0.15rem] text-disabled" />
                            </div>
                            <div
                                class={`${ui.highlight_container} h-3 p-y-.25 my-0.25
                                flex items-center gap-x-1 cursor-pointer`}
                                style={{
                                    [ui.highlight_opacity_var]: hovered.isNodeHovered(node.id)
                                        ? '0.3'
                                        : '0',
                                }}
                                {...hoverProps}
                                onClick={() => inspector.setInspectedOwner(node.id)}
                            >
                                <div
                                    class={`${ui.highlight_element} b b-solid b-gray-400 rounded-sm`}
                                />
                                {node.type === debug.NodeType.Component ||
                                 node.type === debug.NodeType.Element ? (
                                    <div
                                        class={node.type === debug.NodeType.Component
                                            ? 'text-text'
                                            : 'text-disabled'}
                                    >
                                        {node.name || debug.UNKNOWN}
                                    </div>
                                ) : (
                                    <ui.Node_Type_Icon
                                        type={node.type}
                                        class="w-2.5 h-2.5 text-disabled"
                                    />
                                )}
                            </div>
                        </>
                    })}
                </div>
            </div>
        </div>
    )
}

export const OwnerNode: s.Component<{
    owner: Structure.Node
    isHovered: boolean
    isSelected: boolean
    isCollapsed: boolean
    onHoverChange(hovered: boolean): void
    onInspectChange(inspect: boolean): void
    listenToUpdate(cb: VoidFunction): VoidFunction
    toggleCollapsed(node: Structure.Node): void
}> = props => {
    const {onHoverChange, listenToUpdate, onInspectChange} = props
    const {name, type, hmr} = props.owner

    const {toggleCollapsed} = props

    const {pingUpdated, OwnerName} = ui.createHighlightedOwnerName()
    listenToUpdate(pingUpdated)

    const hoverProps = createHover(onHoverChange)

    return (
        <div
            class={`${path_height_class} relative flex items-center p-r-4 cursor-pointer`}
            onClick={() => onInspectChange(!props.isSelected)}
            role="treeitem"
            aria-selected={props.isSelected}
            {...hoverProps}
        >
            <div
                class="absolute -z-1 inset-y-0 inset-x-1
                rounded bg-highlight-bg b b-solid b-highlight-border
                transition-opacity duration-100"
                style={{
                    opacity: props.isHovered ? 0.2 : props.isSelected ? 0.45 : 0,
                }}
            ></div>
            <div
                class="relative -z-2 ml-3.5"
                style={{
                    width: `calc(${props.owner.level} * ${row_padding} + ${theme.spacing[2]})`,
                    height: `calc(${row_height} + 0.95px)`,
                    background: background_gradient,
                    'mask-image': padding_mask,
                    '-webkit-mask-image': padding_mask,
                }}
            />
            <div class="relative flex items-center gap-x-2 min-w-36">
                <ui.CollapseToggle
                    class="absolute -left-6 opacity-0 selected:opacity-100
                    before:content-empty before:absolute before:-z-2 before:inset-.5 before:rounded-full
                    before:bg-white dark:before:bg-gray-800 before:transition-background-color
                    hover:before:bg-panel-2"
                    style={{
                        left: `-${row_height}`,
                        opacity: props.isHovered || props.isSelected ? 1 : '',
                    }}
                    onToggle={() => toggleCollapsed(props.owner)}
                    collapsed={props.isCollapsed}
                />
                <OwnerName name={name} type={type} frozen={props.owner.frozen} />
                {hmr && <ui.Badge>HMR</ui.Badge>}
            </div>
        </div>
    )
}
