import { getOwnerId, getSdtId } from '../main/id'
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
let SignalIdCache: Map<NodeID, Solid.Signal>
export type SignalIdCache = typeof SignalIdCache
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
  const id = isOwner ? getOwnerId(node) : getSdtId(node)
  if (Graph[id]) return

  if (!isOwner) SignalIdCache.set(id, node)

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
    graph: !isOwner && node.graph ? getSdtId(node.graph) : undefined,
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
): {
  graph: SerializedDGraph.Graph
  signalIdCache: SignalIdCache
  clearListeners: VoidFunction
} {
  const graph: SerializedDGraph.Graph = (Graph = {})
  const visitedSources = (VisitedSources = new Set())
  const visitedObservers = (VisitedObservers = new Set())
  const signalIdCache: SignalIdCache = (SignalIdCache = new Map())
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

  Graph = VisitedObservers = SignalIdCache = VisitedSources = DepthMap = OnNodeUpdate = undefined!

  return { graph, signalIdCache, clearListeners }
}
