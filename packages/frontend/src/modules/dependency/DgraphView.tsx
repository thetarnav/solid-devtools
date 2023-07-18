import { useController } from '@/controller'
import { createHighlightedOwnerName, Scrollable } from '@/ui'
import { NodeID, SerializedDGraph } from '@solid-devtools/debugger/types'
import { createHover } from '@solid-devtools/shared/primitives'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import { Component, createContext, createMemo, For, Show, untrack, useContext } from 'solid-js'
import { createDependencyGraph, Dgraph } from './dgraph'
import * as styles from './graph.css'
import { depthVar } from './graph.css'

const DgraphContext = createContext<Dgraph.Module>()

export const useDgraph = () => {
  const ctx = useContext(DgraphContext)
  if (!ctx) throw new Error('Dgraph context not found')
  return ctx
}

type NodeOrder = {
  flowOrder: readonly NodeID[]
  depthMap: Readonly<Record<NodeID, number>>
}

function calculateNodeOrder(
  graph: SerializedDGraph.Graph,
  inspectedId: NodeID,
  inspectedNode: SerializedDGraph.Node,
): NodeOrder {
  const depthGroups = new Map<number, NodeID[]>([[inspectedNode.depth, [inspectedId]]])

  // breadth-first traversal
  // direct observers will be included closest to the inspected node
  // and further observers will be included further away

  // observers and sources are checked in parallel
  // by one list of ids per cycle
  // and the cycle is repeated until all ids are checked

  // so that the closer the node is to the inspected node in the d-graph
  // (no matter if it's an observer or a source)
  // the closer it will be to the inspected node in the list
  // and more likely to be on the correct side of the inspected node
  // (sources are added to the top of the list, observers to the bottom)

  const flowOrder = [inspectedId]
  const checkedObservers = new Set(flowOrder)
  const checkedSources = new Set(flowOrder)

  const toCheck: [sources: (readonly NodeID[])[], observers: (readonly NodeID[])[]] = [
    inspectedNode.sources ? [inspectedNode.sources] : [],
    inspectedNode.observers ? [inspectedNode.observers] : [],
  ]
  let index = 0
  let checkingObservers: 0 | 1 = 0
  let ids = toCheck[checkingObservers][0] ?? toCheck[(checkingObservers = 1)][index]
  while (ids) {
    for (const id of ids) {
      const node = graph[id]
      if (!node) continue

      const inSources = checkedSources.has(id)
      const inObservers = checkedObservers.has(id)

      !inSources && node.sources && node.sources.length && toCheck[0].push(node.sources)
      !inObservers && node.observers && node.observers.length && toCheck[1].push(node.observers)

      if (!inSources && !inObservers) {
        flowOrder[checkingObservers ? 'push' : 'unshift'](id)
        const depthList = depthGroups.get(node.depth)
        if (depthList) depthList.push(id)
        else depthGroups.set(node.depth, [id])
      }

      checkingObservers
        ? inObservers || checkedObservers.add(id)
        : inSources || checkedSources.add(id)
    }

    index += checkingObservers
    ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
    if (!ids) {
      index += checkingObservers
      ids = toCheck[(checkingObservers = (checkingObservers ^ 1) as 0 | 1)][index]
    }
  }

  // sort nodes by depth (horizontal alignment)
  const depthOrder = Array.from(depthGroups.entries()).sort(([a], [b]) => a - b)
  const depthMap: Record<NodeID, number> = {}
  for (let i = 0; i < depthOrder.length; i++) {
    const ids = depthOrder[i]![1]
    for (const id of ids) depthMap[id] = i
  }

  return { flowOrder, depthMap }
}

const GraphNode: Component<{
  id: NodeID
  depth: number
  node: SerializedDGraph.Node
  isInspected: boolean
  onInspect: VoidFunction
  isHovered: boolean
  onHoverChange: (hovered: boolean) => void
  listenToUpdate(cb: VoidFunction): VoidFunction
}> = props => {
  const { name, type } = props.node
  const hoverProps = createHover(props.onHoverChange)

  const { pingUpdated, OwnerName } = createHighlightedOwnerName()
  props.listenToUpdate(pingUpdated)

  return (
    <div
      class={styles.node}
      data-hovered={props.isHovered}
      data-inspected={props.isInspected}
      style={assignInlineVars({ [depthVar]: props.depth + '' })}
      onClick={props.onInspect}
      {...hoverProps}
    >
      <OwnerName name={name} type={type} />
    </div>
  )
}

const DgraphView: Component = () => {
  const ctx = useController()
  const { inspector, hovered } = ctx
  const dgraph = createDependencyGraph()

  const order = createMemo<NodeOrder | null>(
    (p = null) => {
      const graph = dgraph.graph()
      if (!graph) return null

      return untrack(() => {
        const inspectedId = inspector.inspected.signalId ?? inspector.inspected.ownerId
        if (!inspectedId) return p
        const inspectedNode = graph[inspectedId]
        if (!inspectedNode) return p
        return calculateNodeOrder(graph, inspectedId, inspectedNode)
      })
    },
  )

  const thereIsAHoveredNode = createMemo(() => !!hovered.hoveredId())

  return (
    <Scrollable contentProps={{ class: styles.container }}>
      <div class={styles.graph}>
        <Show when={dgraph.graph() && order()}>
          {untrack(() => {
            const flowOrder = () => order()!.flowOrder
            const depthMap = () => order()!.depthMap
            const length = () => flowOrder().length
            const nodeMargin = () => 0.75 / length()
            return (
              <>
                <For each={flowOrder()}>
                  {id => (
                    <GraphNode
                      id={id}
                      depth={depthMap()[id]!}
                      node={dgraph.graph()![id]!}
                      isInspected={inspector.isInspected(id)}
                      onInspect={() => dgraph.inspectNode(id)}
                      isHovered={hovered.isNodeHovered(id)}
                      onHoverChange={state => hovered.toggleHoveredNode(id, 'node', state)}
                      listenToUpdate={listener => ctx.listenToNodeUpdate(id, listener)}
                    />
                  )}
                </For>
                <svg
                  style={assignInlineVars({ [styles.lengthVar]: length() + '' })}
                  class={styles.svg}
                  viewBox="0 0 1 1"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <marker
                      id="head"
                      orient="auto"
                      refX="10"
                      refY="2"
                      style={{ overflow: 'visible' }}
                    >
                      <path d="M0,0 L2.5,2 0,4" class={styles.arrowHead} />
                    </marker>
                  </defs>
                  <For each={flowOrder()}>
                    {(id, flowIndex) => (
                      <For each={dgraph.graph()![id]!.sources}>
                        {sourceId => (
                          <Show when={dgraph.graph()![sourceId]}>
                            {untrack(() => {
                              const math = createMemo(() => {
                                const l = length()
                                const x1 = depthMap()[id]! / l
                                const x2 = depthMap()[sourceId]! / l
                                const y1 = flowIndex() / l
                                const y2 = flowOrder().indexOf(sourceId) / l
                                const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                                return { x1, x2, y1, y2, d }
                              })

                              return (
                                <line
                                  x1={math().x1}
                                  x2={math().x2}
                                  y1={math().y1}
                                  y2={math().y2}
                                  stroke-width={0.05 / length()}
                                  stroke-dasharray={`${math().d - nodeMargin()} 1`}
                                  stroke-dashoffset={nodeMargin() / -2}
                                  marker-end="url(#head)"
                                  data-highlighted={
                                    // hovered node should take precedence over inspected node
                                    thereIsAHoveredNode()
                                      ? hovered.isNodeHovered(id) || hovered.isNodeHovered(sourceId)
                                      : inspector.isInspected(id) || inspector.isInspected(sourceId)
                                  }
                                  class={styles.line}
                                />
                              )
                            })}
                          </Show>
                        )}
                      </For>
                    )}
                  </For>
                </svg>
              </>
            )
          })}
        </Show>
      </div>
    </Scrollable>
  )
}

export default DgraphView
