import { structure, inspector, Structure } from "@/state"
import { OwnerPath, Scrollable } from "@/ui"
import { NodeID } from "@solid-devtools/shared/graph"
import { assignInlineVars } from "@vanilla-extract/dynamic"
import {
  Accessor,
  Component,
  createContext,
  createMemo,
  createSignal,
  For,
  Show,
  useContext,
} from "solid-js"
import { OwnerNode } from "./OwnerNode"
import * as styles from "./structure.css"

export type StructureContextState = {
  handleFocus: (owner: Structure.Node | null) => void
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  useSelectedSelector: (owner: Structure.Node) => Accessor<boolean>
}

const StructureContext = createContext<StructureContextState>()

export const useStructure = () => {
  const ctx = useContext(StructureContext)
  if (!ctx) throw "GraphContext wasn't provided."
  return ctx
}

export default function StructureView() {
  return (
    <div class={styles.panelWrapper}>
      <StructureContext.Provider
        value={{
          handleFocus: inspector.setSelectedNode,
          // TODO
          useUpdatedSelector: () => () => false,
          useSelectedSelector: inspector.useOwnerSelectedSelector,
        }}
      >
        <DisplayStructureTree />
      </StructureContext.Provider>
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
  level: number
}

const remToPx = (rem: number): number =>
  rem * parseFloat(getComputedStyle(document.documentElement).fontSize)

let $startIndex = 20
let $endIndex = 0
let $index = 0
let $nextList: DisplayNode[] = []
let $prevMap: Record<NodeID, DisplayNode> = {}

function mapNode(node: Structure.Node, level: number): void {
  const prev = $prevMap[node.id]
  $nextList.push(prev ?? { node, level })
}

function mapNodes(nodes: readonly Structure.Node[], level: number): void {
  for (const node of nodes) {
    const { children, length } = node
    const i = $index++

    // above the visible
    if (i < $startIndex) {
      // some nested children are visible
      if (i + length >= $startIndex) mapNodes(children, level + 1)
      // all nested children are invisible — skip
      else $index += length
    }
    // visible
    else if (i <= $endIndex) {
      mapNode(node, level)
      mapNodes(children, level + 1)
    }
    // below the visible
    else break
  }
}

const DisplayStructureTree: Component = props => {
  const [containerScroll, setContainerScroll] = createSignal({ top: 0, height: 0 })

  const updateScrollData = (el: HTMLElement) =>
    setContainerScroll({ top: el.scrollTop, height: el.clientHeight })

  const tree = createMemo<{
    length: number
    start: number
    end: number
    list: readonly DisplayNode[]
    rootList: readonly Structure.Node[]
  }>((prev = { length: 0, start: 0, end: 0, list: [], rootList: [] }) => {
    const rootList = structure.structure()
    const { top, height } = containerScroll()
    const rowHeight = remToPx(styles.ROW_HEIGHT_IN_REM)

    $startIndex = Math.floor(top / rowHeight)
    $endIndex = $startIndex + Math.ceil(height / rowHeight)

    if (prev.rootList === rootList && prev.start === $startIndex && prev.end === $endIndex)
      return prev

    let length = 0
    for (const root of rootList) length += root.length + 1

    $index = 0
    $nextList = []
    $prevMap = {}
    for (const node of prev.list) $prevMap[node.node.id] = node

    mapNodes(rootList, 0)

    return { length, list: $nextList, start: $startIndex, end: $endIndex, rootList }
  })

  return (
    <Scrollable
      ref={el => setTimeout(() => updateScrollData(el))}
      onScroll={e => updateScrollData(e.currentTarget)}
    >
      <div
        class={styles.scrolledOuter}
        style={assignInlineVars({
          [styles.treeLength]: tree().length.toString(),
          [styles.startIndex]: tree().start.toString(),
        })}
      >
        <div class={styles.scrolledInner}>
          <For each={tree().list}>
            {({ node, level }) => <OwnerNode owner={node} level={level} />}
          </For>
        </div>
      </div>
    </Scrollable>
  )
}
