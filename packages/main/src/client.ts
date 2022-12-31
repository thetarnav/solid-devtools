import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import { defer } from '@solid-devtools/shared/primitives'
import { createEffect, createSignal, onCleanup } from 'solid-js'
import {
  makeMessageListener,
  makePostMessage,
  Messages,
  startListeningWindowMessages,
} from './bridge'

startListeningWindowMessages()
const _fromContent = makeMessageListener<Messages.Extension>()
const fromContent: typeof _fromContent = (...args) => onCleanup(_fromContent(...args))
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

    fromContent('ForceUpdate', () => debug.forceTriggerUpdate())

    fromContent('InspectValue', debug.inspector.toggleValueNode)
    fromContent('InspectNode', debug.inspector.setInspectedNode)

    debug.listenTo('StructureUpdates', updates => toContent('StructureUpdate', updates))

    debug.listenTo('ComputationUpdates', updates => {
      toContent('ComputationUpdates', updates)
    })

    debug.listenTo('InspectorUpdate', update => toContent('InspectorUpdate', update))

    // send the focused owner details
    debug.listenTo('InspectedNodeDetails', details => toContent('InspectedDetails', details))

    // state of the extension's locator mode
    fromContent('LocatorMode', debug.locator.toggleEnabled)
    createEffect(defer(debug.locator.enabledByDebugger, state => toContent('LocatorMode', state)))

    // intercept on-page components clicks and send them to the devtools panel
    debug.locator.addClickInterceptor((e, component) => {
      e.preventDefault()
      e.stopPropagation()
      toContent('ClientInspectedNode', component.id)
      return false
    })

    debug.locator.onHoveredComponent(data => toContent('HoverComponent', data))

    fromContent('HighlightElement', payload => debug.locator.setHighlightTarget(payload))

    fromContent('OpenLocation', debug.openInspectedNodeLocation)

    fromContent('TreeViewMode', debug.changeTreeWalkerMode)
  })
})
