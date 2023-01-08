import { createInternalRoot, useDebugger } from '@solid-devtools/debugger'
import { defer } from '@solid-devtools/shared/primitives'
import { createEffect, onCleanup } from 'solid-js'
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

toContent('ClientConnected', process.env['VERSION']!)

let loadedBefore = false

createInternalRoot(() => {
  const debug = useDebugger()

  fromContent('DevtoolsOpened', () => {
    debug.toggleEnabled(true)
    debug.structure.toggleEnabled(true)
  })
  fromContent('DevtoolsClosed', () => {
    debug.toggleEnabled(false)
    debug.structure.toggleEnabled(false)
  })

  createEffect(() => {
    if (!debug.enabled()) return

    if (loadedBefore) debug.structure.forceTriggerUpdate()
    else loadedBefore = true

    fromContent('ForceUpdate', () => debug.structure.forceTriggerUpdate())

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

    fromContent('TreeViewMode', debug.structure.setTreeWalkerMode)
  })
})
