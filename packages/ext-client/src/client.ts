import { batch, createEffect, onCleanup } from 'solid-js'
import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import {
  onWindowMessage,
  postWindowMessage,
  startListeningWindowMessages,
} from '@solid-devtools/shared/bridge'
import { defer } from '@solid-devtools/shared/primitives'

startListeningWindowMessages()

// in case of navigation/page reload, reset the locator mode state in the extension
postWindowMessage('ResetPanel')

postWindowMessage('SolidOnPage', process.env.VERSION!)

let loadedBefore = false

createInternalRoot(() => {
  const debug = useDebugger()

  // update the graph only if the devtools panel is in view
  onWindowMessage('PanelVisibility', debug.toggleEnabled)

  // disable debugger and reset any state
  onWindowMessage('PanelClosed', () => {
    batch(() => {
      debug.toggleEnabled(false)
      debug.setInspectedNode(null)
    })
  })

  createEffect(() => {
    if (!debug.enabled()) return

    if (loadedBefore) debug.forceTriggerUpdate()
    else loadedBefore = true

    onCleanup(onWindowMessage('ForceUpdate', () => debug.forceTriggerUpdate()))

    onCleanup(
      onWindowMessage('ToggleInspected', payload => {
        if (payload.type === 'node') debug.setInspectedNode(payload.data)
        else if (payload.type === 'value') debug.setInspectedValue(payload.data)
        else if (payload.type === 'prop')
          debug.setInspectedProp(payload.data.id, payload.data.selected)
        else if (payload.type === 'signal') {
          const { id, selected } = payload.data
          const value = debug.setInspectedSignal(id, selected)
          if (value) postWindowMessage('SignalUpdates', { signals: [{ id, value }], update: false })
        }
      }),
    )

    debug.listenTo('StructureUpdates', updates => postWindowMessage('StructureUpdate', updates))

    debug.listenTo('ComputationUpdates', updates =>
      postWindowMessage('ComputationUpdates', updates),
    )

    debug.listenTo('SignalUpdates', updates => {
      postWindowMessage('SignalUpdates', { signals: updates, update: true })
    })

    debug.listenTo('PropsUpdate', updates => postWindowMessage('PropsUpdate', updates))

    debug.listenTo('ValueUpdate', ({ value, update }) => {
      postWindowMessage('ValueUpdate', { value, update })
    })

    // send the focused owner details
    debug.listenTo('InspectedNodeDetails', details => {
      postWindowMessage('SetInspectedDetails', details)
    })

    // state of the extension's locator mode
    onCleanup(onWindowMessage('ExtLocatorMode', debug.locator.toggleEnabled))
    createEffect(
      defer(debug.locator.enabledByDebugger, state =>
        postWindowMessage('ClientLocatorMode', state),
      ),
    )

    // intercept on-page components clicks and send them to the devtools panel
    debug.locator.addClickInterceptor((e, component) => {
      e.preventDefault()
      e.stopPropagation()
      postWindowMessage('ClientInspectedNode', component.id)
      return false
    })

    debug.locator.onHoveredComponent(data => {
      postWindowMessage('ClientHoveredComponent', data)
    })

    onCleanup(
      onWindowMessage('HighlightElement', payload => debug.locator.setHighlightTarget(payload)),
    )
  })
})
