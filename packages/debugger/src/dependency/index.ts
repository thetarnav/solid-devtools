import { EmitterEmit, Listen } from '@solid-primitives/event-bus'
import { throttle } from '@solid-primitives/scheduled'
import { Accessor, createEffect } from 'solid-js'
import type { Debugger } from '../main'
import { DevtoolsMainView } from '../main/constants'
import { getObjectById, ObjectType } from '../main/id'
import { NodeID, Solid } from '../main/types'
import { isSolidComponent, isSolidComputation } from '../main/utils'
import { collectDependencyGraph, OnNodeUpdate, SerializedDGraph } from './collect'

export { SerializedDGraph } from './collect'

export type DGraphUpdate = SerializedDGraph.Graph | null

export function createDependencyGraph(props: {
  emit: EmitterEmit<Debugger.OutputChannels>
  enabled: Accessor<boolean>
  inspectedState: Accessor<Debugger.InspectedState>
  listenToInspectedStateChange: Listen<Debugger.InspectedState>
  listenToViewChange: Listen<DevtoolsMainView>
  onNodeUpdate: (nodeId: NodeID) => void
}) {
  let clearListeners: VoidFunction | null = null

  const onNodeUpdate: OnNodeUpdate = id => {
    // separate the callback from the computation
    queueMicrotask(() => {
      if (!props.enabled()) return
      props.onNodeUpdate(id)
      triggerInspect()
    })
  }

  function inspectDGraph() {
    // listeners need to be cleared each time, because each update will cause the graph to be mapped again
    clearListeners?.()

    const state = props.inspectedState()

    let inspectedNode: Solid.Signal | Solid.Owner | null = null
    let isSignal = false
    if (state.signalId) {
      inspectedNode = getObjectById(state.signalId, ObjectType.Signal)
      isSignal = true
    } else if (state.ownerId) {
      inspectedNode = getObjectById(state.ownerId, ObjectType.Owner)
    }

    if (
      !props.enabled() ||
      !inspectedNode ||
      (!isSignal &&
        (!isSolidComputation(inspectedNode as Solid.Owner) ||
          isSolidComponent(inspectedNode as Solid.Owner)))
    ) {
      clearListeners = null
      props.emit('DgraphUpdate', null)
      return
    }

    const dgraph = collectDependencyGraph(inspectedNode as Solid.Computation | Solid.Signal, {
      onNodeUpdate,
    })
    clearListeners = dgraph.clearListeners
    props.emit('DgraphUpdate', dgraph.graph)
  }
  const triggerInspect = throttle(inspectDGraph, 200)

  props.listenToInspectedStateChange(() => {
    inspectDGraph()
  })

  props.listenToViewChange(() => {
    inspectDGraph()
  })

  createEffect(() => {
    props.enabled()
    inspectDGraph()
  })
}
