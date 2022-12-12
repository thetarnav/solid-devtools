import { createEffect, onCleanup } from 'solid-js'
import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { Controller } from '@solid-devtools/frontend'
import { defer } from '@solid-devtools/shared/primitives'

enableRootsAutoattach()

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))
const separate = <T>(obj: T, callback: (value: T) => void): void => {
  queueMicrotask(() => {
    const v = clone(obj)
    queueMicrotask(() => callback(v))
  })
}

export function createController() {
  const debug = useDebugger()

  onCleanup(() => debug.inspector.setInspectedNode(null))

  const controller = new Controller({
    onDevtoolsLocatorStateChange(enabled) {
      queueMicrotask(() => debug.locator.toggleEnabled(enabled))
    },
    onHighlightElementChange(data) {
      queueMicrotask(() => debug.locator.setHighlightTarget(data))
    },
    onInspectNode(node) {
      queueMicrotask(() => debug.inspector.setInspectedNode(node))
    },
    onInspectValue(node) {
      queueMicrotask(() => debug.inspector.toggleValueNode(node))
    },
    onOpenLocation() {
      queueMicrotask(() => debug.openInspectedNodeLocation())
    },
    onTreeViewModeChange(mode) {
      queueMicrotask(() => debug.changeTreeWalkerMode(mode))
    },
  })

  debug.listenTo('StructureUpdates', updates => {
    queueMicrotask(() => controller.updateStructure(updates))
  })

  debug.listenTo('ComputationUpdates', updates => {
    queueMicrotask(() => controller.updateComputation(updates))
  })

  debug.listenTo('InspectorUpdate', payload => {
    separate(payload, payload => controller.updateInspector(payload))
  })

  // send the focused owner details
  debug.listenTo('InspectedNodeDetails', details => {
    separate(details, details => controller.setInspectedDetails(details))
  })

  // send the state of the client locator mode
  createEffect(
    defer(debug.locator.enabledByDebugger, state => {
      queueMicrotask(() => controller.setLocatorState(state))
    }),
  )

  // intercept on-page components clicks and send them to the devtools overlay
  debug.locator.addClickInterceptor((e, component) => {
    e.preventDefault()
    e.stopPropagation()
    queueMicrotask(() => controller.setInspectedNode(component.id))
    return false
  })

  debug.locator.onHoveredComponent(data => {
    queueMicrotask(() => controller.setHoveredNode(data))
  })

  return controller
}
