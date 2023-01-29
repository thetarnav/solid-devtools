import { getSdtId } from '../main/id'
import { NodeID, Solid } from '../main/types'
import {
  observeComputationUpdate,
  observeValueUpdate,
  removeComputationUpdateObserver,
  removeValueUpdateObserver,
} from '../main/update'
import { getNodeName, getNodeType, isSolidOwner } from '../main/utils'
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
  const id = getSdtId(node)
  if (Graph[id]) return

  // observe each mapped node, to update the graph when it changes
  const onNodeUpdate = OnNodeUpdate
  observeNodeUpdate(node, () => onNodeUpdate(node))

  Graph[id] = {
    name: getNodeName(node),
    type: getNodeType(node) as Exclude<ComputationNodeType, NodeType.Memo>,
    depth: lookupDepth(node),
    sources: (node as Solid.Memo).sources ? (node as Solid.Memo).sources!.map(getSdtId) : undefined,
    observers: (node as Solid.Memo).observers
      ? (node as Solid.Memo).observers!.map(getSdtId)
      : undefined,
    graph: !isSolidOwner(node) && node.graph ? getSdtId(node.graph) : undefined,
  } as SerializedDGraph.Node
}

function visitSource(node: Solid.Signal | Solid.Memo) {
  if (VisitedSources.has(node)) return
  VisitedSources.add(node)
  addNodeToGraph(node)
  if ('sources' in node && node.sources) node.sources.forEach(visitSource)
}

function visitObserver(node: Solid.Computation | Solid.Memo) {
  if (VisitedObservers.has(node)) return
  VisitedObservers.add(node)
  addNodeToGraph(node)
  if ('observers' in node && node.observers) node.observers.forEach(visitObserver)
}

function lookupDepth(node: Solid.Owner | Solid.Signal): number {
  const id = getSdtId(node)

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
) {
  Graph = {}
  const visitedSources = (VisitedSources = new Set())
  const visitedObservers = (VisitedObservers = new Set())
  DepthMap = {}
  OnNodeUpdate = config.onNodeUpdate

  addNodeToGraph(node)
  if ('sources' in node && node.sources) node.sources.forEach(visitSource)
  if ('observers' in node && node.observers) node.observers.forEach(visitObserver)

  const result = Graph

  // clear all listeners
  const clearListeners = () => {
    visitedSources.forEach(unobserveNodeUpdate)
    visitedObservers.forEach(unobserveNodeUpdate)
    unobserveNodeUpdate(node)
  }

  Graph = VisitedObservers = VisitedSources = DepthMap = OnNodeUpdate = undefined!

  return { graph: result, clearListeners }
}
