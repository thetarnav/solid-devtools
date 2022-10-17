import { createEffect, onCleanup } from 'solid-js'
import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { Controller } from '@solid-devtools/frontend'
import { defer } from '@solid-devtools/shared/primitives'

enableRootsAutoattach()

export function createController() {
  const debug = useDebugger()

  onCleanup(() => debug.setInspectedNode(null))

  const controller = new Controller({
    onDevtoolsLocatorStateChange(enabled) {
      queueMicrotask(() => debug.locator.toggleEnabled(enabled))
    },
    onHighlightElementChange(data) {
      queueMicrotask(() => debug.locator.setHighlightTarget(data))
    },
    onInspect(payload) {
      queueMicrotask(() => {
        if (payload.type === 'node') debug.setInspectedNode(payload.data)
        else if (payload.type === 'value') debug.setInspectedValue(payload.data)
        else if (payload.type === 'prop')
          debug.setInspectedProp(payload.data.id, payload.data.selected)
        else if (payload.type === 'signal') {
          const { id, selected } = payload.data
          const value = debug.setInspectedSignal(id, selected)
          if (value) {
            queueMicrotask(() =>
              controller.updateSignals({ signals: [{ id, value }], update: false }),
            )
          }
        }
      })
    },
  })

  debug.listenTo('StructureUpdates', updates => {
    queueMicrotask(() => controller.updateStructure(updates))
  })

  debug.listenTo('ComputationUpdates', updates => {
    queueMicrotask(() => controller.updateComputation(updates))
  })

  debug.listenTo('SignalUpdates', updates => {
    queueMicrotask(() => controller.updateSignals({ signals: updates, update: true }))
  })

  debug.listenTo('PropsUpdate', updates => {
    queueMicrotask(() => controller.updateProps(updates))
  })

  debug.listenTo('ValueUpdate', ({ value, update }) => {
    queueMicrotask(() => controller.updateValue({ value, update }))
  })

  // send the focused owner details
  debug.listenTo('InspectedNodeDetails', details => {
    queueMicrotask(() => controller.setInspectedDetails(details))
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
