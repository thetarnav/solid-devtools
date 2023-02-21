import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { Debugger } from '@solid-devtools/debugger/types'
import { log, warn } from '@solid-devtools/shared/utils'
import { makeMessageListener, makePostMessage, startListeningWindowMessages } from '../src/bridge'

import.meta.env.DEV && log('Debugger-Client loaded')

enableRootsAutoattach()
startListeningWindowMessages()

const fromContent = makeMessageListener<Debugger.InputChannels>()
const toContent = makePostMessage<Debugger.OutputChannels>()

const toVersionTuple = (version: string) =>
  version.split('.').map(Number) as [number, number, number]

function warnOnVersionMismatch(actual: string | null, expected: string, title: string) {
  if (!actual) {
    return warn(`No ${title} version found!`)
  }

  // warn if the matching adapter version is not the same minor version range as the actual adapter
  const actualTuple = toVersionTuple(actual)
  const expectedTuple = toVersionTuple(expected)

  if (
    actualTuple[0] !== expectedTuple[0] ||
    actualTuple[1] !== expectedTuple[1] ||
    actualTuple[2] < expectedTuple[2]
  ) {
    warn(
      `VERSION MISMATCH!
Current version: ${title}@${actual}
Expected version: ${title}@${expected}`,
    )
  }
}

const debug = useDebugger()

warnOnVersionMismatch(debug.meta.versions.client, import.meta.env.EXPECTED_CLIENT, 'solid-devtools')
debug.meta.versions.expectedSolid &&
  warnOnVersionMismatch(debug.meta.versions.solid, debug.meta.versions.expectedSolid, 'solid-js')

// in case of navigation/page reload, reset the locator mode state in the extension
toContent('ResetPanel')
toContent('ClientConnected', debug.meta.versions)

fromContent('DevtoolsOpened', () => debug.toggleEnabled(true))
fromContent('DevtoolsClosed', () => debug.toggleEnabled(false))

// pass all the devtools events to the debugger
fromContent(e => debug.emit(e.name as any, e.details))

// pass all the debugger events to the content script
debug.listen(e => toContent(e.name, e.details))
