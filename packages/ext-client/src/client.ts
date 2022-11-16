import { createEffect, createSignal, onCleanup } from 'solid-js'
import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import {
  makeMessageListener,
  Messages,
  makePostMessage,
  startListeningWindowMessages,
} from './bridge'
import { defer } from '@solid-devtools/shared/primitives'

startListeningWindowMessages()
const fromContent = makeMessageListener<Messages.Extension>()
const toContent = makePostMessage<Messages.Client>()

// in case of navigation/page reload, reset the locator mode state in the extension
toContent('ResetPanel')

toContent('ClientConnected', process.env.VERSION!)

let loadedBefore = false

createInternalRoot(() => {
  const debug = useDebugger()
  const [enabled, setEnabled] = createSignal(false)
  debug.setUserEnabledSignal(enabled)

  fromContent('DevtoolsOpened', () => setEnabled(true))
  fromContent('DevtoolsClosed', () => setEnabled(false))

  createEffect(() => {
    if (!enabled()) return

    if (loadedBefore) debug.forceTriggerUpdate()
    else loadedBefore = true

    onCleanup(fromContent('ForceUpdate', () => debug.forceTriggerUpdate()))

    onCleanup(fromContent('InspectValue', debug.inspector.toggleValueNode))
    onCleanup(fromContent('InspectNode', debug.inspector.setInspectedNode))

    debug.listenTo('StructureUpdates', updates => toContent('StructureUpdate', updates))

    debug.listenTo('ComputationUpdates', updates => {
      toContent('ComputationUpdates', updates)
    })

    debug.listenTo('InspectorUpdate', update => toContent('InspectorUpdate', update))

    // send the focused owner details
    debug.listenTo('InspectedNodeDetails', details => toContent('InspectedDetails', details))

    // state of the extension's locator mode
    onCleanup(fromContent('LocatorMode', debug.locator.toggleEnabled))
    createEffect(defer(debug.locator.enabledByDebugger, state => toContent('LocatorMode', state)))

    // intercept on-page components clicks and send them to the devtools panel
    debug.locator.addClickInterceptor((e, component) => {
      e.preventDefault()
      e.stopPropagation()
      toContent('ClientInspectedNode', component.id)
      return false
    })

    debug.locator.onHoveredComponent(data => toContent('HoverComponent', data))

    onCleanup(fromContent('HighlightElement', payload => debug.locator.setHighlightTarget(payload)))

    onCleanup(fromContent('OpenLocation', debug.openInspectedNodeLocation))
  })
})
