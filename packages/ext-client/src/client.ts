import { batch, createEffect, createSignal, on, onCleanup } from 'solid-js'
import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import * as locator from '@solid-devtools/locator'
import {
  Messages,
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from '@solid-devtools/shared/bridge'
import { warn } from '@solid-devtools/shared/utils'

startListeningWindowMessages()

// in case of navigation/page reload, reset the locator mode state in the extension
postWindowMessage('ResetPanel')

postWindowMessage('SolidOnPage', process.env.VERSION!)

let loadedBefore = false

createInternalRoot(() => {
  const [enabled, setEnabled] = createSignal(false)
  locator.addHighlightingSource(enabled)

  const {
    forceTriggerUpdate,
    findComponent,
    listenTo,
    setInspectedNode,
    inspectedDetails,
    getElementById,
    setInspectedSignal,
    setInspectedProp,
    setInspectedValue,
  } = useDebugger({ enabled })

  // update the graph only if the devtools panel is in view
  onWindowMessage('PanelVisibility', setEnabled)

  // disable debugger and reset any state
  onWindowMessage('PanelClosed', () => {
    batch(() => {
      setEnabled(false)
      setInspectedNode(null)
    })
  })

  createEffect(() => {
    if (!enabled()) return

    if (loadedBefore) forceTriggerUpdate()
    else loadedBefore = true

    onCleanup(onWindowMessage('ForceUpdate', forceTriggerUpdate))

    onCleanup(onWindowMessage('InspectedNodeChange', setInspectedNode))

    onCleanup(
      onWindowMessage('ToggleInspectedValue', payload => {
        if (payload.type === 'signal') {
          const { id, selected } = payload
          const value = setInspectedSignal(id, selected)
          if (value) postWindowMessage('SignalUpdates', { signals: [{ id, value }], update: false })
        } else if (payload.type === 'prop') {
          const { id, selected } = payload
          setInspectedProp(id, selected)
        } else {
          setInspectedValue(payload.selected)
        }
      }),
    )

    listenTo('StructureUpdates', updates => postWindowMessage('StructureUpdate', updates))

    listenTo('ComputationUpdates', updates => postWindowMessage('ComputationUpdates', updates))

    listenTo('SignalUpdates', updates => {
      postWindowMessage('SignalUpdates', { signals: updates, update: true })
    })

    listenTo('PropsUpdate', updates => postWindowMessage('PropsUpdate', updates))

    listenTo('ValueUpdate', ({ value, update }) => {
      postWindowMessage('ValueUpdate', { value, update })
    })

    // send the focused owner details
    createEffect(() => {
      const details = inspectedDetails()
      if (details) postWindowMessage('SetInspectedDetails', details)
    })

    // TODO: abstract state sharing to a separate package
    // state of the extension's locator mode
    const [extLocatorEnabled, setExtLocatorEnabled] = createSignal(false)
    locator.addLocatorModeSource(extLocatorEnabled)
    onCleanup(onWindowMessage('ExtLocatorMode', setExtLocatorEnabled))
    createEffect(
      on(locator.locatorModeEnabled, state => postWindowMessage('ClientLocatorMode', state), {
        defer: true,
      }),
    )

    // intercept on-page components clicks and send them to the devtools panel
    locator.addClickInterceptor((e, component) => {
      e.preventDefault()
      e.stopPropagation()
      postWindowMessage('ClientInspectedNode', component.id)
      return false
    })

    // TODO: this logic should be a part of the debugger, this way the different clients don't have to duplicate it
    let skipNextHoveredComponent = true
    // listen for op-page components being hovered and send them to the devtools panel
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
          postWindowMessage('ClientHoveredNodeChange', data)
        }
      } else {
        data = { nodeId: hovered.id, state: true }
        postWindowMessage('ClientHoveredNodeChange', data)
      }
      return data
    })

    onCleanup(
      onWindowMessage('HighlightElement', payload => {
        if (!payload) return locator.setTarget(null)
        let target: locator.TargetComponent | HTMLElement
        // highlight component
        if (typeof payload === 'object') {
          const { rootId, nodeId } = payload
          const component = findComponent(rootId, nodeId)
          if (!component) return warn('No component found', nodeId)
          target = { ...component, rootId }
        }
        // highlight element
        else {
          const element = getElementById(payload)
          if (!element) return warn('No element found', payload)
          target = element
        }
        locator.setTarget(p => {
          if (p === target) return p
          // prevent creating an infinite loop
          skipNextHoveredComponent = true
          return target
        })
      }),
    )
  })
})
