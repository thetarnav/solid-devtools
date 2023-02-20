import { createInternalRoot, enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { Debugger } from '@solid-devtools/debugger/types'
import { log } from '@solid-devtools/shared/utils'
import { createEffect, onCleanup } from 'solid-js'
import { makeMessageListener, makePostMessage, startListeningWindowMessages } from '../src/bridge'

import.meta.env.DEV && log('Debugger-Client loaded')

enableRootsAutoattach()
startListeningWindowMessages()

const _fromContent = makeMessageListener<Debugger.InputChannels>()
const fromContent: typeof _fromContent = ((...args: [any, any]) =>
  onCleanup(_fromContent(...args))) as any
const toContent = makePostMessage<Debugger.OutputChannels>()

// in case of navigation/page reload, reset the locator mode state in the extension
toContent('ResetPanel')

// TODO
toContent('ClientConnected', '0.0.0')

createInternalRoot(() => {
  const debug = useDebugger()

  fromContent('DevtoolsOpened', () => debug.toggleEnabled(true))
  fromContent('DevtoolsClosed', () => debug.toggleEnabled(false))

  createEffect(() => {
    if (!debug.enabled()) return

    // pass all the devtools events to the debugger
    fromContent(e => debug.emit(e.name as any, e.details))

    // pass all the debugger events to the content script
    debug.listen(e => toContent(e.name, e.details))
  })
})
