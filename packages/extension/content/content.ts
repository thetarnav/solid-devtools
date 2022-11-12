import {
  onWindowMessage as fromClient,
  postWindowMessage as toClient,
  startListeningWindowMessages,
} from 'solid-devtools/bridge'
import { error, warn } from '@solid-devtools/shared/utils'
import { createPortMessanger, CONTENT_CONNECTION_NAME } from '../shared/messanger'

// @ts-expect-error ?script&module query ensures output in ES module format and only import the script path
import realWorld from './realWorld?script&module'

const extVersion = chrome.runtime.getManifest().version
const matchingClientVersion = __CLIENT_VERSION__

const port = chrome.runtime.connect({ name: CONTENT_CONNECTION_NAME })

startListeningWindowMessages()
const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger(port)

{
  // Evaluate the real-world script to detect if solid is on the page
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL(realWorld)
  script.type = 'module'
  script.addEventListener('error', err => error('Real world script failed to load.', err))
  document.head.append(script)
  fromClient('SolidOnPage', () => toBackground('SolidOnPage'))
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
})

fromClient('ResetPanel', () => toBackground('ResetPanel'))

fromClient('StructureUpdate', graph => toBackground('StructureUpdate', graph))

fromClient('ComputationUpdates', e => toBackground('ComputationUpdates', e))

fromClient('SetInspectedDetails', e => toBackground('SetInspectedDetails', e))

fromClient('InspectorUpdate', e => toBackground('InspectorUpdate', e))

fromClient('ClientHoveredComponent', e => toBackground('ClientHoveredComponent', e))

fromClient('ClientInspectedNode', e => toBackground('ClientInspectedNode', e))

fromBackground('DevtoolsOpened', () => toClient('DevtoolsOpened'))
fromBackground('DevtoolsClosed', () => toClient('DevtoolsClosed'))

fromBackground('ForceUpdate', () => toClient('ForceUpdate'))

fromBackground('ToggleInspectedValue', e => toClient('ToggleInspectedValue', e))
fromBackground('SetInspectedNode', e => toClient('SetInspectedNode', e))

fromBackground('HighlightElement', e => toClient('HighlightElement', e))

fromClient('ClientLocatorMode', e => toBackground('ClientLocatorMode', e))
fromBackground('ExtLocatorMode', e => toClient('ExtLocatorMode', e))
