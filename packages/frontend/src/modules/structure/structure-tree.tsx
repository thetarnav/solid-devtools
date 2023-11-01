import { hover_background, panel_header_el_border } from '@/SidePanel'
import { useController, useDevtoolsOptions } from '@/controller'
import { Icon, Scrollable, ToggleButton, ToggleTabs, theme } from '@/ui'
import { toggle_tab_color_var } from '@/ui/components/toggle-tabs'
import { NodeID, NodeType, TreeWalkerMode } from '@solid-devtools/debugger/types'
import { Atom, atom } from '@solid-devtools/shared/primitives'
import { makeEventListener } from '@solid-primitives/event-listener'
import { createShortcut } from '@solid-primitives/keyboard'
import { createResizeObserver } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { defer } from '@solid-primitives/utils'
import {
    Component,
    For,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    useContext,
} from 'solid-js'
import type { Structure } from '.'
import createStructure from '.'
import { OwnerNode } from './owner-node'
import { OwnerPath } from './owner-path'
import { path_height, row_height, row_height_in_rem, row_padding, v_margin_in_rem } from './styles'
import { getVirtualVars } from './virtual'

const StructureContext = createContext<Structure.Module>()

export function useStructure() {
    const ctx = useContext(StructureContext)
    if (!ctx) throw new Error('Structure context not found')
    return ctx
}

export default function StructureView() {
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

const LocatorButton: Component = () => {
    const { locator } = useController()
    return (
        <ToggleButton
            class="shrink-0 w-7 h-7"
            onToggle={locator.setLocatorState}
            selected={locator.locatorEnabled()}
            title="Select an element in the page to inspect it"
        >
            <Icon.Select class="w-4 h-4" />
        </ToggleButton>
    )
}

const Search: Component = () => {
    const options = useDevtoolsOptions()
    const structure = useStructure()

    const [value, setValue] = createSignal('')

    const handleChange = (v: string) => {
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
                <Icon.Search class={icon_base} />
            </div>
            {value() && (
                <button
                    class={`${hover_background} ${edge_container_base} right-1 p-x-.5 rounded`}
                    type="reset"
                >
                    <Icon.Close class={icon_base} />
                </button>
            )}
        </form>
    )
}

const ToggleMode: Component = () => {
    const structure = useStructure()

    const tabsContentMap: Readonly<Record<TreeWalkerMode, string>> = {
        [TreeWalkerMode.Owners]: 'Owners',
        [TreeWalkerMode.Components]: 'Components',
        [TreeWalkerMode.DOM]: 'DOM',
    }

    return (
        <div class="ml-auto h-full">
            <ToggleTabs
                class="h-full"
                active={structure.mode()}
                onSelect={structure.changeTreeViewMode}
            >
                {Option =>
                    [TreeWalkerMode.Components, TreeWalkerMode.Owners, TreeWalkerMode.DOM].map(
                        mode => (
                            <Option
                                for={mode}
                                class="group"
                                style={{
                                    [toggle_tab_color_var]:
                                        mode === TreeWalkerMode.Owners
                                            ? theme.vars.text.DEFAULT
                                            : mode === TreeWalkerMode.DOM
                                            ? theme.vars.dom
                                            : theme.vars.component,
                                }}
                            >
                                <div
                                    class="w-2 h-2 rounded-full border border-solid opacity-60 transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-[[aria-selected=true]]:opacity-100"
                                    style={{
                                        'border-color': `var(${toggle_tab_color_var})`,
                                    }}
                                />
                                {tabsContentMap[mode]}
                            </Option>
                        ),
                    )
                }
            </ToggleTabs>
        </div>
    )
}

const getFocusedNodeData = (
    list: Structure.Node[],
    start: number,
    end: number,
    index: number,
): [node: NodeID, position: number] | undefined => {
    if (index < start || index > end) index = Math.floor(end - (end - start) / 1.618)
    let node = list[index]
    let move = 0
    while (node) {
        if (node.type === NodeType.Component || node.type === NodeType.Root)
            return [node.id, index - start]
        move = move <= 0 ? -move + 1 : -move
        node = list[(index += move)]
    }
}

const DisplayStructureTree: Component = () => {
    const [containerScroll, setContainerScroll] = createSignal({ top: 0, height: 0 })

    const remSize = useRemSize()
    const getContainerTopMargin = () => remSize() * v_margin_in_rem
    const getRowHeight = () => remSize() * row_height_in_rem

    const updateScrollData = (el: HTMLElement) => {
        setContainerScroll({
            top: Math.max(el.scrollTop - getContainerTopMargin(), 0),
            height: el.clientHeight,
        })
    }

    const [collapsed, setCollapsed] = createSignal(new WeakSet<Structure.Node>(), { equals: false })

    const isCollapsed = (node: Structure.Node) => collapsed().has(node)

    const toggleCollapsed = (node: Structure.Node) => {
        setCollapsed(set => {
            set.delete(node) || set.add(node)
            return set
        })
    }

    const ctx = useController()
    const { inspector, hovered } = ctx
    const structure = useStructure()

    let lastVirtualStart = 0
    let lastVirtualEnd = 0
    let lastInspectedIndex = 0
    let lastFocusedNodeData: ReturnType<typeof getFocusedNodeData>

    createEffect(() => {
        ;({ start: lastVirtualStart, end: lastVirtualEnd } = virtual())
        lastInspectedIndex = inspectedIndex()
    })

    const collapsedList = createMemo((prev: Structure.Node[] = []) => {
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

        const nodeList = structure.state().nodeList
        const collapsedList: Structure.Node[] = []
        const set = collapsed()

        let skip = 0
        for (const node of nodeList) {
            const skipped = skip > 0
            if (skipped) skip--
            else collapsedList.push(node)

            if (skipped || set.has(node)) skip += node.children.length
        }

        return collapsedList
    })

    const virtual = createMemo<{
        start: number
        end: number
        fullLength: number
        list: readonly Atom<Structure.Node>[]
        nodeList: readonly Structure.Node[]
        minLevel: number
    }>((prev = { start: 0, end: 0, fullLength: 0, list: [], nodeList: [], minLevel: 0 }) => {
        const nodeList = collapsedList()
        const { top, height } = containerScroll()
        const { start, end, length } = getVirtualVars(nodeList.length, top, height, getRowHeight())

        if (prev.nodeList === nodeList && prev.start === start && prev.end === end) return prev

        const next: Atom<Structure.Node>[] = Array(length)
        const prevMap: Record<NodeID, Atom<Structure.Node>> = {}
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

        return { list: next, start, end, nodeList, fullLength: nodeList.length, minLevel }
    })

    const minLevel = createMemo(() => Math.max(virtual().minLevel - 7, 0), 0, {
        equals: (a, b) => a == b || (Math.abs(b - a) < 7 && b != 0),
    })

    // calculate node indexP in the collapsed list
    const getNodeIndexById = (id: NodeID) => {
        const nodeList = collapsedList()
        for (let i = 0; i < nodeList.length; i++) if (nodeList[i]!.id === id) return i
        return -1
    }

    // Index of the inspected node in the collapsed list
    const inspectedIndex = createMemo(() => {
        const id = inspector.inspected.treeWalkerOwnerId
        return id ? getNodeIndexById(id) : -1
    })

    // Seep the inspected or central node in view when the list is changing
    createEffect(
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
    createEffect(() => {
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

            const { start, end } = virtual()
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

            const { key } = e

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
                        if (node.type === NodeType.Element) continue
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
                        if (parent.type === NodeType.Element) parent = parent.parent
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
                        if (child.type === NodeType.Element) child = child.children[0]
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
        <Scrollable
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
                        <For each={virtual().list}>
                            {node => {
                                const { id } = node.value
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
                        </For>
                    </div>
                </div>
            </div>
        </Scrollable>
    )
}
