import { Accessor, Component, createEffect, createMemo, createSignal, For, untrack } from 'solid-js'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { useRemSize } from '@solid-primitives/styles'
import { createResizeObserver } from '@solid-primitives/resize-observer'
import { NodeID } from '@solid-devtools/debugger/types'
import type { Structure } from '.'
import { Scrollable } from '@/ui'
import { OwnerNode } from './OwnerNode'
import { OwnerPath } from './Path'
import { getVirtualVars } from './virtual'
import * as styles from './structure.css'
import { useController } from '@/controller'

export default function StructureView() {
  return (
    <div class={styles.panelWrapper}>
      <DisplayStructureTree />
      <OwnerPath />
    </div>
  )
}

type DisplayNode = {
  node: Structure.Node
  getNode: Accessor<Structure.Node>
  update: VoidFunction
}

const DisplayStructureTree: Component = () => {
  const [containerScroll, setContainerScroll] = createSignal({ top: 0, height: 0 })

  const remSize = useRemSize()
  const getContainerTopMargin = () => remSize() * styles.V_MARGIN_IN_REM
  const getRowHeight = () => remSize() * styles.ROW_HEIGHT_IN_REM

  const updateScrollData = (el: HTMLElement) =>
    setContainerScroll({
      top: Math.max(el.scrollTop - getContainerTopMargin(), 0),
      height: el.clientHeight,
    })

  const [collapsed, setCollapsed] = createSignal(new WeakSet<Structure.Node>(), { equals: false })

  const toggleCollapsed = (node: Structure.Node) =>
    setCollapsed(set => {
      set.delete(node) || set.add(node)
      return set
    })

  const {
    structureState,
    inspectedNode,
    structure,
    isNodeInspected,
    listenToComputationUpdate,
    toggleHoveredNode,
    setInspectedNode,
  } = useController()

  const collapsedList = createMemo(() => {
    const nodeList = structureState().nodeList
    const collapsedList: Structure.Node[] = []
    const set = collapsed()

    let skip = 0
    for (const node of nodeList) {
      const skipped = skip > 0
      if (skipped) skip--
      else collapsedList.push(node)

      if (skipped || set.has(node)) {
        const { children, subroots } = node
        skip += children.length
        if (subroots) skip += subroots.length
      }
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
      const prev = prevMap[node.id]
      minLevel = Math.min(minLevel, node.level)
      if (prev) {
        next[i] = prev
        prev.update()
      } else {
        const [getNode, setNode] = createSignal(node, { equals: false, internal: true })
        next[i] = { node, getNode, update: () => setNode(node) }
      }
    }

    return { list: next, start, end, nodeList, fullLength: nodeList.length, minLevel }
  })

  const minLevel = createMemo(() => Math.max(virtual().minLevel - 7, 0), 0, {
    equals: (a, b) => a == b || (Math.abs(b - a) < 7 && b != 0),
  })

  // Scroll to selected node when it changes
  createEffect(() => {
    const node = inspectedNode()
    if (!node) return
    untrack(() => {
      let index = collapsedList().indexOf(node)
      if (index === -1) {
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
          index = collapsedList().indexOf(node)
        } else return
      }

      const { start, end } = virtual()
      const rowHeight = getRowHeight()
      const containerTopMargin = getContainerTopMargin()
      let top: number
      if (index <= start + 2) top = (index - 1) * rowHeight
      else if (index >= end - 2) top = (index + 2) * rowHeight - containerScroll().height
      else return

      container.scrollTop = top + containerTopMargin
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
              {({ getNode, node }) => (
                <OwnerNode
                  owner={getNode()}
                  isHovered={structure.isHovered(node)}
                  isSelected={isNodeInspected(node.id)}
                  listenToUpdate={listener =>
                    listenToComputationUpdate(id => id === node.id && listener())
                  }
                  onHoverChange={hovered => toggleHoveredNode(node.id, hovered)}
                  onInspectChange={inspected => setInspectedNode(inspected ? node : null)}
                  toggleCollapsed={toggleCollapsed}
                  isCollapsed={collapsed().has(node)}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Scrollable>
  )
}
