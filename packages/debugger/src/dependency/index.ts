import { Listen } from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import { Accessor, createEffect } from 'solid-js'
import { InspectedState } from '../main'
import { DevtoolsMainView } from '../main/constants'
import { getSdtId } from '../main/id'
import { NodeID } from '../main/types'
import { isSolidComponent, isSolidComputation, isSolidOwner } from '../main/utils'
import { collectDependencyGraph, OnNodeUpdate, SerializedDGraph } from './collect'

export { SerializedDGraph } from './collect'

export type DGraphUpdate = SerializedDGraph.Graph | null

export function createDependencyGraph(props: {
  enabled: Accessor<boolean>
  listenToInspectedStateChange: Listen<InspectedState>
  listenToViewChange: Listen<DevtoolsMainView>
  emitDependencyGraph: (update: DGraphUpdate) => void
  onNodeUpdate: (nodeId: NodeID) => void
}) {
  let inspectedState: InspectedState = { signal: null, owner: null }
  let clearListeners: VoidFunction | null = null

  const onNodeUpdate: OnNodeUpdate = node => {
    // separate the callback from the computation
    queueMicrotask(() => {
      if (!props.enabled()) return
      props.onNodeUpdate(getSdtId(node))
      triggerInspect()
    })
  }

  function inspectDGraph() {
    const inspectedNode = inspectedState?.signal ?? inspectedState?.owner
    if (
      !props.enabled() ||
      !inspectedNode ||
      (isSolidOwner(inspectedNode) &&
        (!isSolidComputation(inspectedNode) || isSolidComponent(inspectedNode)))
    ) {
      clearListeners?.()
      clearListeners = null
      props.emitDependencyGraph(null)
      return
    }

    // listeners need to be cleared each time, because each update will cause the graph to be mapped again
    clearListeners?.()
    const dgraph = collectDependencyGraph(inspectedNode, { onNodeUpdate })
    clearListeners = dgraph.clearListeners
    props.emitDependencyGraph(dgraph.graph)
  }
  const triggerInspect = throttle(inspectDGraph, 200)

  props.listenToInspectedStateChange(newInspected => {
    inspectedState = newInspected
    inspectDGraph()
  })

  props.listenToViewChange(() => {
    inspectDGraph()
  })

  createEffect(() => {
    props.enabled()
    inspectDGraph()
  })

  return {}
}
