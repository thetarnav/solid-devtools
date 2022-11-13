import { createEffect, createSignal, onCleanup } from 'solid-js'
import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import { onWindowMessage, postWindowMessage, startListeningWindowMessages } from './bridge'
import { defer } from '@solid-devtools/shared/primitives'

startListeningWindowMessages()

// in case of navigation/page reload, reset the locator mode state in the extension
postWindowMessage('ResetPanel')

postWindowMessage('ClientConnected', process.env.VERSION!)

let loadedBefore = false

createInternalRoot(() => {
  const debug = useDebugger()
  const [enabled, setEnabled] = createSignal(false)
  debug.setUserEnabledSignal(enabled)

  onWindowMessage('DevtoolsOpened', () => setEnabled(true))
  onWindowMessage('DevtoolsClosed', () => setEnabled(false))

  createEffect(() => {
    if (!enabled()) return

    if (loadedBefore) debug.forceTriggerUpdate()
    else loadedBefore = true

    onCleanup(onWindowMessage('ForceUpdate', () => debug.forceTriggerUpdate()))

    onCleanup(onWindowMessage('ToggleInspectedValue', debug.inspector.toggleValueNode))
    onCleanup(onWindowMessage('SetInspectedNode', debug.inspector.setInspectedNode))

    debug.listenTo('StructureUpdates', updates => postWindowMessage('StructureUpdate', updates))

    debug.listenTo('ComputationUpdates', updates => {
      postWindowMessage('ComputationUpdates', updates)
    })

    debug.listenTo('InspectorUpdate', update => postWindowMessage('InspectorUpdate', update))

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
