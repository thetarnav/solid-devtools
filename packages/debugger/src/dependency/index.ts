import { Listen } from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import { Accessor } from 'solid-js'
import { InspectedState } from '../main'
import { DevtoolsMainView } from '../main/constants'
import { getSdtId } from '../main/id'
import { NodeID } from '../main/types'
import { isSolidComponent, isSolidComputation, isSolidOwner } from '../main/utils'
import { collectDependencyGraph, DGraph, OnNodeUpdate } from './collect'

export { DGraph } from './collect'

export type DGraphUpdate = DGraph.Graph | null

export function createDependencyGraph(props: {
  enabled: Accessor<boolean>
  listenToInspectedStateChange: Listen<InspectedState>
  listenToViewChange: Listen<DevtoolsMainView>
  emitDependencyGraph: (update: DGraphUpdate) => void
  onNodeUpdate: (nodeId: NodeID) => void
}) {
  let inspectedState: InspectedState = null

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
      !inspectedNode ||
      (isSolidOwner(inspectedNode) &&
        (!isSolidComputation(inspectedNode) || isSolidComponent(inspectedNode)))
    ) {
      return
    }

    const dgraph = collectDependencyGraph(inspectedNode, { onNodeUpdate })

    props.emitDependencyGraph(dgraph)
  }
  const triggerInspect = throttle(inspectDGraph, 200)

  props.listenToInspectedStateChange(newInspected => {
    inspectedState = newInspected
    if (props.enabled()) inspectDGraph()
  })

  props.listenToViewChange(view => {
    if (view === DevtoolsMainView.Dgraph && props.enabled()) inspectDGraph()
  })

  return {}
}
