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
    onInspect(payload) {
      queueMicrotask(() => {
        if (payload.type === 'node') {
          debug.inspector.setInspectedNode(payload.data)
        } else if (payload.type === 'value') {
          debug.inspector.setInspectedValue(payload.data)
        } else if (payload.type === 'prop') {
          debug.inspector.setInspectedProp(payload.data.id, payload.data.selected)
        } else if (payload.type === 'signal') {
          const { id, selected } = payload.data
          const value = debug.inspector.setInspectedSignal(id, selected)
          value &&
            separate(value, value =>
              controller.updateSignals({ signals: [{ id, value }], update: false }),
            )
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
    separate(updates, updates => controller.updateSignals({ signals: updates, update: true }))
  })

  debug.listenTo('PropsUpdate', updates => {
    separate(updates, updates => controller.updateProps(updates))
  })

  debug.listenTo('ValueUpdate', ({ value, update }) => {
    separate(value, value => controller.updateValue({ value, update }))
  })

  // send the focused owner details
  debug.listenTo('InspectedNodeDetails', details => {
    queueMicrotask(() => controller.setInspectedDetails(clone(details)))
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
