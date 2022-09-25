import { structure, inspector, Structure } from "@/state"
import { Scrollable } from "@/ui"
import { NodeID } from "@solid-devtools/shared/graph"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { Accessor, Component, createMemo, createSignal, For, Setter, Show } from "solid-js"
import { OwnerNode } from "./OwnerNode"
import { OwnerPath } from "./Path"
import * as styles from "./structure.css"
import { getVirtualVars, remToPx } from "./virtual"

export default function StructureView() {
  return (
    <div class={styles.panelWrapper}>
      <DisplayStructureTree />
      <div class={styles.path}>
        <div class={styles.pathInner}>
          <Show when={inspector.details()?.path}>
            <OwnerPath path={inspector.details()!.path} />
          </Show>
        </div>
      </div>
    </div>
  )
}

type DisplayNode = {
  node: Structure.Node
  level: Accessor<number>
  setLevel: Setter<number>
}

const DisplayStructureTree: Component = props => {
  const [containerScroll, setContainerScroll] = createSignal({ top: 0, height: 0 })

  const updateScrollData = (el: HTMLElement) =>
    setContainerScroll({ top: el.scrollTop, height: el.clientHeight })

  const [collapsed, setCollapsed] = createSignal(new WeakSet<Structure.Node>(), { equals: false })

  const toggleCollapsed = (node: Structure.Node) =>
    setCollapsed(set => {
      set.delete(node) || set.add(node)
      return set
    })

  const collapsedList = createMemo(() => {
    const nodeList = structure.structure().nodeList
    const collapsedList: Structure.Node[] = []
    const set = collapsed()

    let skip = 0
    for (const node of nodeList) {
      if (skip) skip--
      else collapsedList.push(node)

      if (skip || set.has(node)) {
        const { children, subroots } = node
        skip += children.length
        if (subroots) skip += subroots.length
      }
    }

    return collapsedList
  })

  const ROW_HEIGHT_IN_REM = styles.ROW_HEIGHT_IN_REM

  const virtual = createMemo<{
    start: number
    end: number
    fullLength: number
    list: readonly DisplayNode[]
    nodeList: readonly Structure.Node[]
  }>((prev = { start: 0, end: 0, fullLength: 0, list: [], nodeList: [] }) => {
    const nodeList = collapsedList()
    const { top, height } = containerScroll()
    const { start, end, length } = getVirtualVars(
      nodeList.length,
      top,
      height,
      remToPx(ROW_HEIGHT_IN_REM),
    )

    if (prev.nodeList === nodeList && prev.start === start && prev.end === end) return prev

    const next: DisplayNode[] = Array(length)
    const prevMap: Record<NodeID, DisplayNode> = {}
    for (const node of prev.list) prevMap[node.node.id] = node

    for (let i = 0; i < length; i++) {
      const node = nodeList[start + i]
      const prev = prevMap[node.id]
      if (prev) {
        next[i] = prev
        prev.setLevel(node.level)
      } else {
        const [level, setLevel] = createSignal(node.level)
        next[i] = { node, level, setLevel }
      }
    }

    return { list: next, start, end, nodeList, fullLength: nodeList.length }
  })

  return (
    <Scrollable
      ref={el => setTimeout(() => updateScrollData(el))}
      onScroll={e => updateScrollData(e.currentTarget)}
    >
      <div
        class={styles.scrolledOuter}
        style={assignInlineVars({
          [styles.treeLength]: virtual().fullLength.toString(),
          [styles.startIndex]: virtual().start.toString(),
        })}
      >
        <div class={styles.scrolledInner}>
          <For each={virtual().list}>
            {({ node, level }) => <OwnerNode owner={node} level={level()} />}
          </For>
        </div>
      </div>
    </Scrollable>
  )
}
