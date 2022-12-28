import { useController } from '@/controller'
import { Icon, Scrollable, ToggleButton } from '@/ui'
import { NodeID, NodeType, TreeWalkerMode } from '@solid-devtools/debugger/types'
import { defer } from '@solid-devtools/shared/primitives'
import { createShortcut } from '@solid-primitives/keyboard'
import { createResizeObserver } from '@solid-primitives/resize-observer'
import { useRemSize } from '@solid-primitives/styles'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import {
  Component,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  For,
  Setter,
} from 'solid-js'
import type { Structure } from '.'
import { OwnerNode } from './OwnerNode'
import { OwnerPath } from './Path'
import * as styles from './structure.css'
import { getVirtualVars } from './virtual'

export default function StructureView() {
  return (
    <div class={styles.panelWrapper}>
      <div class={styles.header}>
        <LocatorButton />
        <Search />
        <ToggleMode />
      </div>
      <DisplayStructureTree />
      <OwnerPath />
    </div>
  )
}

const LocatorButton: Component = () => {
  const ctx = useController()
  return (
    <ToggleButton
      class={styles.locatorButton}
      onToggle={ctx.setLocatorState}
      selected={ctx.locatorEnabled()}
    >
      <Icon.Select class={styles.locatorIcon} />
    </ToggleButton>
  )
}

const Search: Component = () => {
  const ctx = useController()

  const [value, setValue] = createSignal('')

  const handleChange = (v: string) => {
    setValue(v)
    ctx.searchStructure('')
  }

  return (
    <form
      class={styles.search.form}
      onSubmit={e => {
        e.preventDefault()
        ctx.searchStructure(value())
      }}
      onReset={() => handleChange('')}
    >
      <input
        ref={input => {
          if (ctx.options.useShortcuts) {
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
  const ctx = useController()

  const tabsContentMap: Readonly<Record<TreeWalkerMode, string>> = {
    [TreeWalkerMode.Owners]: 'Owners',
    [TreeWalkerMode.Components]: 'Components',
    [TreeWalkerMode.DOM]: 'DOM',
  }

  const isSelected = createSelector<TreeWalkerMode, TreeWalkerMode>(ctx.structure.mode)

  return (
    <div class={styles.toggleMode.group}>
      <div class={styles.toggleMode.list} role="group">
        {[TreeWalkerMode.Components, TreeWalkerMode.Owners, TreeWalkerMode.DOM].map(mode => (
          <button
            aria-selected={isSelected(mode)}
            class={styles.toggleMode.tab[mode]}
            onClick={() => ctx.changeTreeViewMode(mode)}
          >
            {tabsContentMap[mode]}
          </button>
        ))}
      </div>
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

  const {
    structureState,
    inspector,
    structure,
    isNodeInspected,
    listenToComputationUpdate,
    toggleHoveredNode,
    setInspectedNode,
  } = useController()

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

    const nodeList = structureState().nodeList
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
      const node = nodeList[start + i]
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
    for (let i = 0; i < nodeList.length; i++) if (nodeList[i].id === id) return i
    return -1
  }

  // Index of the inspected node in the collapsed list
  const inspectedIndex = createMemo(() => {
    const id = inspector.inspectedId()
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
    if (!inspector.inspectedId()) return
    // Run in next tick to ensure the scroll data is updated and virtual list recalculated
    // inspect node -> open inspector -> container changes height -> scroll data changes -> virtual list changes -> scroll to node
    setTimeout(() => {
      let index = inspectedIndex()
      if (index === -1) {
        const node = inspector.inspectedNode()
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
                    isHovered={structure.isHovered(id)}
                    isSelected={isNodeInspected(id)}
                    listenToUpdate={listener =>
                      listenToComputationUpdate(updatedId => updatedId === id && listener())
                    }
                    onHoverChange={hovered => toggleHoveredNode(id, hovered)}
                    onInspectChange={inspected => setInspectedNode(inspected ? id : null)}
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
