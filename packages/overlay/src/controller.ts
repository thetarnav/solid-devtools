import { createEffect, createSignal, on, onCleanup } from 'solid-js'
import { createMediaQuery } from '@solid-primitives/media'
import { createInternalRoot, enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import * as locator from '@solid-devtools/locator'
import { Controller } from '@solid-devtools/frontend'
import { Messages } from '@solid-devtools/shared/bridge'

const { setEnabled, enabled, debuggerData } = createInternalRoot(() => {
  const [userEnabled, setEnabled] = createSignal(false)
  const enabled = () => userEnabled()

  const debuggerData = useDebugger({ enabled: enabled })

  locator.addHighlightingSource(enabled)
  enableRootsAutoattach()
  return { setEnabled, enabled, debuggerData }
})
export { setEnabled, enabled }

export function createController() {
  const {
    findComponent,
    listenTo,
    inspectedDetails,
    getElementById,
    setInspectedNode,
    setInspectedSignal,
    setInspectedProp,
    setInspectedValue,
  } = debuggerData

  onCleanup(() => setInspectedNode(null))

  const [devtoolsLocatorEnabled, setDevtoolsLocatorState] = createSignal(false)
  locator.addLocatorModeSource(devtoolsLocatorEnabled)

  const controller = new Controller({
    onDevtoolsLocatorStateChange(enabled) {
      queueMicrotask(() => setDevtoolsLocatorState(enabled))
    },
    onHighlightElementChange(data) {
      queueMicrotask(() => handleDevtoolsHoveredElement(data))
    },
    onInspectedNodeChange(data) {
      queueMicrotask(() => setInspectedNode(data))
    },
    onInspectValue(data) {
      queueMicrotask(() => {
        if (data.type === 'signal') {
          const { id, selected } = data
          const value = setInspectedSignal(id, selected)
          if (value) controller.updateSignals({ signals: [{ id, value }], update: false })
        } else if (data.type === 'prop') {
          const { id, selected } = data
          setInspectedProp(id, selected)
        } else {
          setInspectedValue(data.selected)
        }
      })
    },
  })

  listenTo('StructureUpdates', updates => queueMicrotask(() => controller.updateStructure(updates)))

  listenTo('ComputationUpdates', updates =>
    queueMicrotask(() => controller.updateComputation(updates)),
  )

  listenTo('SignalUpdates', updates =>
    queueMicrotask(() => {
      controller.updateSignals({ signals: updates, update: true })
    }),
  )

  listenTo('PropsUpdate', updates => queueMicrotask(() => controller.updateProps(updates)))

  listenTo('ValueUpdate', ({ value, update }) =>
    queueMicrotask(() => {
      controller.updateValue({ value, update })
    }),
  )

  // send the focused owner details
  // TODO: change this to an event emitter
  createEffect(() => {
    const details = inspectedDetails()
    if (details) {
      queueMicrotask(() => controller.setInspectedDetails(details))
    }
  })

  // send the state of the client locator mode
  createEffect(
    on(
      locator.locatorModeEnabled,
      state => queueMicrotask(() => controller.setLocatorState(state)),
      { defer: true },
    ),
  )

  // intercept on-page components clicks and send them to the devtools
  locator.addClickInterceptor((e, component) => {
    e.preventDefault()
    e.stopPropagation()
    queueMicrotask(() => controller.setInspectedNode(component.id))
    return false
  })

  let skipNextHoveredComponent = true
  // listen for op-page components being hovered and send them to the devtools
  createEffect((prev: Messages['ClientHoveredNodeChange'] | undefined | void) => {
    const hovered = locator.highlightedComponent()[0] as locator.HoveredComponent | undefined
    if (skipNextHoveredComponent) {
      skipNextHoveredComponent = false
      return
    }
    let data: Messages['ClientHoveredNodeChange'] | undefined
    if (!hovered) {
      if (prev && prev.state) {
        data = { nodeId: prev.nodeId, state: false }
        queueMicrotask(() => controller.setHoveredNode(data!))
      }
    } else {
      data = { nodeId: hovered.id, state: true }
      queueMicrotask(() => controller.setHoveredNode(data!))
    }
    return data
  })

  function handleDevtoolsHoveredElement(data: Messages['HighlightElement']) {
    if (!data) return locator.setTarget(null)
    let target: locator.TargetComponent | HTMLElement
    // highlight component
    if (typeof data === 'object') {
      const { rootId, nodeId } = data
      const component = findComponent(rootId, nodeId)
      if (!component) return console.warn('No component found', nodeId)
      target = { ...component, rootId }
    }
    // highlight element
    else {
      const element = getElementById(data)
      if (!element) return console.warn('No element found', data)
      target = element
    }
    locator.setTarget(p => {
      if (p === target) return p
      // prevent creating an infinite loop
      skipNextHoveredComponent = true
      return target
    })
  }

  return controller
}
