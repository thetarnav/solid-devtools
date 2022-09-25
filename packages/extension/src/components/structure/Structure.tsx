import { structure, inspector, Structure } from "@/state"
import { Scrollable } from "@/ui"
import { NodeID } from "@solid-devtools/shared/graph"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import { Accessor, Component, createMemo, createSignal, For, Setter, Show } from "solid-js"
import { OwnerNode } from "./OwnerNode"
import { OwnerPath } from "./Path"
import * as styles from "./structure.css"

export default function StructureView() {
  return (
    <div class={styles.panelWrapper}>
      <DisplayStructureTree />
      <div class={styles.path}>
        <div class={styles.pathInner}>
          <Show when={inspector.state.details?.path}>
            <OwnerPath path={inspector.state.details!.path} />
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

const remToPx = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize)

const DisplayStructureTree: Component = props => {
  const [containerScroll, setContainerScroll] = createSignal({ top: 0, height: 0 })

  const updateScrollData = (el: HTMLElement) =>
    setContainerScroll({ top: el.scrollTop, height: el.clientHeight })

  const tree = createMemo<{
    start: number
    end: number
    list: readonly DisplayNode[]
    nodeList: readonly Structure.Node[]
  }>((prev = { start: 0, end: 0, list: [], nodeList: [] }) => {
    const nodeList = structure.structure().nodeList
    const { top, height } = containerScroll()
    const rowHeight = remToPx(styles.ROW_HEIGHT_IN_REM)

    const start = Math.floor(top / rowHeight)
    const nItems = Math.ceil(height / rowHeight)
    const end = start + nItems

    if (prev.nodeList === nodeList && prev.start === start && prev.end === end) return prev

    const length = Math.min(nItems, nodeList.length)
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

    return { list: next, start, end, nodeList }
  })

  return (
    <Scrollable
      ref={el => setTimeout(() => updateScrollData(el))}
      onScroll={e => updateScrollData(e.currentTarget)}
    >
      <div
        class={styles.scrolledOuter}
        style={assignInlineVars({
          [styles.treeLength]: structure.structure().nodeList.length.toString(),
          [styles.startIndex]: tree().start.toString(),
        })}
      >
        <div class={styles.scrolledInner}>
          <For each={tree().list}>
            {({ node, level }) => <OwnerNode owner={node} level={level()} />}
          </For>
        </div>
      </div>
    </Scrollable>
  )
}
