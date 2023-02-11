import { error, log, warn } from '@solid-devtools/shared/utils'
import {
  forwardMessageToWindow,
  ForwardPayload,
  isForwardMessage,
  makeMessageListener,
  makePostMessage,
  startListeningWindowMessages,
} from 'solid-devtools/bridge'
import { CONTENT_CONNECTION_NAME, createPortMessanger } from '../src/messanger'

import.meta.env.DEV && log('Content script working.')

// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import realWorld from './realWorld?script&module'

const extVersion = chrome.runtime.getManifest().version
const matchingClientVersion = __CLIENT_VERSION__

const port = chrome.runtime.connect({ name: CONTENT_CONNECTION_NAME })

let devtoolsOpened = false

startListeningWindowMessages()
const fromClient = makeMessageListener()
const toClient = makePostMessage()

const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger(port)

{
  // Evaluate the real-world script to detect if solid is on the page
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL(realWorld)
  script.type = 'module'
  script.addEventListener('error', err => error('Real world script failed to load.', err))
  document.head.append(script)
  const handler = (e: MessageEvent) => {
    if (e.data === '__SolidOnPage__') {
      toBackground('SolidOnPage')
      window.removeEventListener('message', handler)
    }
  }
  window.addEventListener('message', handler)
}

fromClient('ClientConnected', clientVersion => {
  // eslint-disable-next-line no-console
  console.log(
    '🚧 %csolid-devtools%c is in early development! 🚧\nPlease report any bugs to https://github.com/thetarnav/solid-devtools/issues',
    'color: #fff; background: rgba(181, 111, 22, 0.7); padding: 1px 4px;',
    'color: #e38b1b',
  )

  const toVersionTuple = (version: string) =>
    version.split('.').map(Number) as [number, number, number]

  // warn if the matching adapter version is not the same minor version range as the actual adapter
  const adapterTuple = toVersionTuple(clientVersion)
  const wantedTuple = toVersionTuple(matchingClientVersion)

  // match only major and minor version
  for (let i = 0; i < 2; i++) {
    if (adapterTuple[i] !== wantedTuple[i]) {
      warn(
        `${i === 0 ? 'MAJOR' : 'MINOR'} VERSION MISMATCH!
Extension version: ${extVersion}
Client version: ${clientVersion}
Expected client version: ${matchingClientVersion}
Please install "solid-devtools@${matchingClientVersion}" in your project`,
      )
      break
    }
  }

  toBackground('Versions', {
    client: clientVersion,
    extension: extVersion,
    expectedClient: matchingClientVersion,
  })

  fromClient('ResetPanel', () => toBackground('ResetPanel'))

  if (devtoolsOpened) toClient('DevtoolsOpened')
})

// After page reload, the content script is reloaded but the background script is not.
// This means that 'DevtoolsOpened' message will come after the Client is setup.
// We need to send it after it connects.
fromBackground('DevtoolsOpened', () => {
  devtoolsOpened = true
  toClient('DevtoolsOpened')
})
fromBackground('DevtoolsClosed', () => toClient('DevtoolsClosed'))

fromClient(e => {
  // forward all client messages to the background script in
  const payload: ForwardPayload = { forwarding: true, name: e.name, details: e.details }
  port.postMessage(payload)
})

port.onMessage.addListener(data => {
  // forward all devtools messages (from background) to the client
  if (isForwardMessage(data)) forwardMessageToWindow(data)
})
