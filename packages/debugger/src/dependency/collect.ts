import { getSdtId, ObjectType } from '../main/id'
import { NodeID, Solid } from '../main/types'
import {
  observeComputationUpdate,
  observeValueUpdate,
  removeComputationUpdateObserver,
  removeValueUpdateObserver,
} from '../main/update'
import { getNodeName, getNodeType, getOwnerType, isSolidOwner } from '../main/utils'
import { ComputationNodeType, NodeType } from '../types'

export namespace SerializedDGraph {
  export type Node = {
    name: string
    depth: number
    type: Exclude<NodeType, NodeType.Root | NodeType.Component>
    sources: readonly NodeID[] | undefined
    observers: readonly NodeID[] | undefined
    // signals parent owner
    graph: NodeID | undefined
  }

  export type Graph = Record<NodeID, Node>
}

const $DGRAPH = Symbol('dependency-graph')

let Graph: SerializedDGraph.Graph
let VisitedSources: Set<Solid.Signal>
let VisitedObservers: Set<Solid.Computation>
let DepthMap: Record<NodeID, number | undefined>
let OnNodeUpdate: (node: Solid.Computation | Solid.Memo | Solid.Signal) => void
export type OnNodeUpdate = typeof OnNodeUpdate

function observeNodeUpdate(
  node: Solid.Computation | Solid.Memo | Solid.Signal,
  handler: VoidFunction,
) {
  if (isSolidOwner(node)) observeComputationUpdate(node, handler, $DGRAPH)
  else observeValueUpdate(node, handler, $DGRAPH)
}
function unobserveNodeUpdate(node: Solid.Computation | Solid.Memo | Solid.Signal) {
  if (isSolidOwner(node)) removeComputationUpdateObserver(node, $DGRAPH)
  else removeValueUpdateObserver(node, $DGRAPH)
}

function addNodeToGraph(node: Solid.Signal | Solid.Memo | Solid.Computation) {
  const isOwner = isSolidOwner(node)
  const id = getSdtId(node, isOwner ? ObjectType.Owner : ObjectType.Signal)
  if (Graph[id]) return

  // observe each mapped node, to update the graph when it changes
  const onNodeUpdate = OnNodeUpdate
  observeNodeUpdate(node, () => onNodeUpdate(node))

  Graph[id] = {
    name: getNodeName(node),
    type: getNodeType(node) as Exclude<ComputationNodeType, NodeType.Memo>,
    depth: lookupDepth(node),
    sources:
      'sources' in node && node.sources
        ? node.sources.map(n => getSdtId(n, isSolidOwner(n) ? ObjectType.Owner : ObjectType.Signal))
        : undefined,
    observers:
      'observers' in node && node.observers
        ? node.observers.map(n => getSdtId(n, ObjectType.Owner))
        : undefined,
    graph: !isOwner && node.graph ? getSdtId(node.graph, ObjectType.Owner) : undefined,
  } as SerializedDGraph.Node
}

function visitSources(node: Solid.Computation | Solid.Memo | Solid.Signal) {
  if ('sources' in node && node.sources) {
    for (const source of node.sources) {
      if (
        VisitedSources.has(source) ||
        (isSolidOwner(source) && getOwnerType(source) === NodeType.Refresh)
      ) {
        return
      }
      VisitedSources.add(source)
      addNodeToGraph(source)
      visitSources(source)
    }
  }
}

function visitObservers(node: Solid.Computation | Solid.Memo | Solid.Signal) {
  if ('observers' in node && node.observers) {
    for (const observer of node.observers) {
      if (VisitedObservers.has(observer) || getOwnerType(observer) === NodeType.Refresh) {
        return
      }
      VisitedObservers.add(observer)
      addNodeToGraph(observer)
      visitObservers(observer)
    }
  }
}

function lookupDepth(node: Solid.Owner | Solid.Signal): number {
  const id = getSdtId(node, isSolidOwner(node) ? ObjectType.Owner : ObjectType.Signal)

  if (id in DepthMap) return DepthMap[id]!

  let owner: Solid.Owner | undefined | null
  // signal
  if (!('owned' in node)) owner = node.graph
  // root
  else if (!('fn' in node) && !node.owner) return 0
  // computation
  else owner = node.owner

  return (DepthMap[id] = owner ? lookupDepth(owner) + 1 : 0)
}

export function collectDependencyGraph(
  node: Solid.Computation | Solid.Memo | Solid.Signal,
  config: { onNodeUpdate: OnNodeUpdate },
): {
  graph: SerializedDGraph.Graph
  clearListeners: VoidFunction
} {
  const graph: SerializedDGraph.Graph = (Graph = {})
  const visitedSources = (VisitedSources = new Set())
  const visitedObservers = (VisitedObservers = new Set())
  DepthMap = {}
  OnNodeUpdate = config.onNodeUpdate

  addNodeToGraph(node)
  visitSources(node)
  visitObservers(node)

  // clear all listeners
  const clearListeners = () => {
    visitedSources.forEach(unobserveNodeUpdate)
    visitedObservers.forEach(unobserveNodeUpdate)
    unobserveNodeUpdate(node)
  }

  Graph = VisitedObservers = VisitedSources = DepthMap = OnNodeUpdate = undefined!

  return { graph, clearListeners }
}
