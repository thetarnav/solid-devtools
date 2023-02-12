import { useController } from '@/controller'
import { Icon, Scrollable, ToggleButton, ToggleTabs } from '@/ui'
import { NodeID, NodeType, TreeWalkerMode } from '@solid-devtools/debugger/types'
import { createShortcut } from '@solid-primitives/keyboard'
import { createResizeObserver } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { defer } from '@solid-primitives/utils'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import {
  Component,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  For,
  Setter,
  useContext,
} from 'solid-js'
import type { Structure } from '.'
import createStructure from '.'
import { OwnerNode } from './OwnerNode'
import { OwnerPath } from './Path'
import * as styles from './structure.css'
import { getVirtualVars } from './virtual'

const StructureContext = createContext<Structure.Module>()

export const useStructure = () => {
  const ctx = useContext(StructureContext)
  if (!ctx) throw new Error('Structure context not found')
  return ctx
}

export default function StructureView() {
  const structure = createStructure()

  return (
    <StructureContext.Provider value={structure}>
      <div class={styles.panelWrapper}>
        <div class={styles.header}>
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
      class={styles.locatorButton}
      onToggle={locator.setLocatorState}
      selected={locator.locatorEnabled()}
    >
      <Icon.Select class={styles.locatorIcon} />
    </ToggleButton>
  )
}

const Search: Component = () => {
  const { options } = useController()
  const structure = useStructure()

  const [value, setValue] = createSignal('')

  const handleChange = (v: string) => {
    setValue(v)
    structure.search('')
  }

  return (
    <form
      class={styles.search.form}
      onSubmit={e => {
        e.preventDefault()
        structure.search(value())
      }}
      onReset={() => handleChange('')}
    >
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
        class={styles.search.input}
        type="text"
        placeholder="Search"
        onInput={e => handleChange(e.currentTarget.value)}
        onPaste={e => handleChange(e.currentTarget.value)}
      />
      <div class={styles.search.iconContainer}>
        <Icon.Search class={styles.search.icon} />
      </div>
      {value() && (
        <button class={styles.search.clearButton} type="reset">
          <Icon.Close class={styles.search.clearIcon} />
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
    <div class={styles.toggleMode.group}>
      <ToggleTabs
        class={styles.toggleMode.list}
        active={structure.mode()}
        onSelect={structure.changeTreeViewMode}
      >
        {Option =>
          [TreeWalkerMode.Components, TreeWalkerMode.Owners, TreeWalkerMode.DOM].map(mode => (
            <Option for={mode} class={styles.toggleMode.tab[mode]}>
              {tabsContentMap[mode]}
            </Option>
          ))
        }
      </ToggleTabs>
    </div>
  )
}

type DisplayNode = {
  node: Structure.Node
  update: Setter<Structure.Node>
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
  const getContainerTopMargin = () => remSize() * styles.V_MARGIN_IN_REM
  const getRowHeight = () => remSize() * styles.ROW_HEIGHT_IN_REM

  const updateScrollData = (el: HTMLElement) => {
    setContainerScroll({
      top: Math.max(el.scrollTop - getContainerTopMargin(), 0),
      height: el.clientHeight,
    })
  }

  const [collapsed, setCollapsed] = createSignal(new WeakSet<Structure.Node>(), { equals: false })

  const toggleCollapsed = (node: Structure.Node) =>
    setCollapsed(set => {
      set.delete(node) || set.add(node)
      return set
    })

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
    // eslint-disable-next-line @typescript-eslint/no-shadow
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
    list: readonly DisplayNode[]
    nodeList: readonly Structure.Node[]
    minLevel: number
  }>((prev = { start: 0, end: 0, fullLength: 0, list: [], nodeList: [], minLevel: 0 }) => {
    const nodeList = collapsedList()
    const { top, height } = containerScroll()
    const { start, end, length } = getVirtualVars(nodeList.length, top, height, getRowHeight())

    if (prev.nodeList === nodeList && prev.start === start && prev.end === end) return prev

    const next: DisplayNode[] = Array(length)
    const prevMap: Record<NodeID, DisplayNode> = {}
    for (const node of prev.list) prevMap[node.node.id] = node

    let minLevel = length ? Infinity : 0

    for (let i = 0; i < length; i++) {
      const node = nodeList[start + i]!
      const prevDNode = prevMap[node.id]
      minLevel = Math.min(minLevel, node.level)
      if (prevDNode) {
        next[i] = prevDNode
        prevDNode.update(node)
      } else {
        const [getNode, update] = createSignal(node, { equals: false, internal: true })
        next[i] = {
          get node() {
            return getNode()
          },
          update,
        }
      }
    }

    return { list: next, start, end, nodeList, fullLength: nodeList.length, minLevel }
  })

  const minLevel = createMemo(() => Math.max(virtual().minLevel - 7, 0), 0, {
    equals: (a, b) => a == b || (Math.abs(b - a) < 7 && b != 0),
  })

  // calculate node index in the collapsed list
  const getNodeIndexById = (id: NodeID) => {
    const nodeList = collapsedList()
    for (let i = 0; i < nodeList.length; i++) if (nodeList[i]!.id === id) return i
    return -1
  }

  // Index of the inspected node in the collapsed list
  const inspectedIndex = createMemo(() => {
    const id = inspector.inspected.ownerId
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
    if (!inspector.inspected.ownerId) return
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
        class={styles.scrolledOuter}
        style={assignInlineVars({
          [styles.treeLength]: virtual().fullLength.toString(),
          [styles.startIndex]: virtual().start.toString(),
          [styles.minLevel]: minLevel().toString(),
        })}
      >
        <div class={styles.scrolledInner}>
          <div class={styles.scrolledInner2}>
            <For each={virtual().list}>
              {data => {
                const { id } = data.node
                return (
                  <OwnerNode
                    owner={data.node}
                    isHovered={hovered.isNodeHovered(id) || structure.isSearched(id)}
                    isSelected={inspector.isInspected(id)}
                    listenToUpdate={listener => ctx.listenToNodeUpdate(id, listener)}
                    onHoverChange={state => hovered.toggleHoveredNode(id, 'node', state)}
                    onInspectChange={inspected =>
                      inspector.setInspectedOwner(inspected ? id : null)
                    }
                    toggleCollapsed={toggleCollapsed}
                    isCollapsed={collapsed().has(data.node)}
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
