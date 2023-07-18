import { useController } from '@/controller'
import {
    DEFAULT_WALKER_MODE,
    DevtoolsMainView,
    NodeID,
    NodeType,
    StructureUpdates,
    type TreeWalkerMode,
} from '@solid-devtools/debugger/types'
import { defer } from '@solid-primitives/utils'
import { batch, createEffect, createMemo, createSelector, createSignal, untrack } from 'solid-js'
import { reconcileStructure } from './reconcile'

export namespace Structure {
    export interface Node {
        id: NodeID
        name?: string
        type: NodeType
        level: number
        parent: Node | null
        children: Node[]
        hmr?: true
        frozen?: true
    }

    export interface Root extends Node {
        name?: undefined
        frozen?: undefined
        type: NodeType.Root
    }

    export type State = { roots: Node[]; nodeList: Node[] }

    // State to be stored in the controller cache
    export type Cache = { short: State; long: { mode: TreeWalkerMode } }

    export type Module = ReturnType<typeof createStructure>
}

/**
 * Finds the top-root node
 */
export function getRootNode(node: Structure.Node): Structure.Node {
    let current: Structure.Node | null = node
    let lastRoot: Structure.Node | undefined
    while (current) {
        if (current.type === NodeType.Root) lastRoot = current
        current = current.parent
    }
    if (lastRoot) return lastRoot
    throw new Error('Parent root not found')
}

export function getClosestComponentNode(node: Structure.Node): Structure.Node | undefined {
    let current: Structure.Node | null = node
    while (current) {
        if (current.type === NodeType.Component) return current
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

export default function createStructure() {
    const ctx = useController()
    const { inspector, bridge } = ctx
    const cachedInitialState = ctx.viewCache.get(DevtoolsMainView.Structure)

    const [mode, setMode] = createSignal<TreeWalkerMode>(
        cachedInitialState.long?.mode ?? DEFAULT_WALKER_MODE,
    )

    function changeTreeViewMode(newMode: TreeWalkerMode): void {
        if (newMode === mode()) return
        batch(() => {
            setMode(newMode)
            search('')
        })
    }

    const [state, setState] = createSignal<Structure.State>(
        cachedInitialState.short || { nodeList: [], roots: [] },
    )
    ctx.viewCache.set(DevtoolsMainView.Structure, () => ({
        short: state(),
        long: { mode: mode() },
    }))

    const inspectedNode = createMemo(() => {
        const id = inspector.inspected.treeWalkerOwnerId
        return id ? findNode(id) : null
    })

    function updateStructure(update: StructureUpdates | null): void {
        setState(prev =>
            update ? reconcileStructure(prev.roots, update) : { nodeList: [], roots: [] },
        )
    }

    function findNode(id: NodeID): Structure.Node | undefined {
        for (const node of state().nodeList) {
            if (node.id === id) return node
        }
    }

    const [searchResult, setSearchResult] = createSignal<NodeID[]>()
    const isSearched = createSelector(searchResult, (node: NodeID, o) => !!o && o.includes(node))

    function searchNodeList(query: string): NodeID[] | undefined {
        if (!query) return setSearchResult()
        return untrack(() => {
            const result: NodeID[] = []
            const rgx = new RegExp('^' + query, 'i')
            for (const node of state().nodeList) {
                if (node.type !== NodeType.Element && node.name && node.name.match(rgx))
                    result.push(node.id)
            }
            return setSearchResult(result.length ? result : undefined)
        })
    }

    // SEARCH NODES
    let lastSearch: string = ''
    let lastSearchResults: NodeID[] | undefined
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
    createEffect(defer(mode, bridge.output.TreeViewModeChange.emit))

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
