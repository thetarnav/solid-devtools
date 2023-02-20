import { Debugger } from '@solid-devtools/debugger/types'
import { createDevtools, MountIcons } from '@solid-devtools/frontend'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { ConnectionName, createPortMessanger, once } from './bridge'

import '@solid-devtools/frontend/dist/index.css'

const port = chrome.runtime.connect({ name: ConnectionName.Panel })
const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger<
  Debugger.OutputChannels,
  Debugger.InputChannels
>(port)

// Force debugger to send state on connect
toBackground('ResetState')

function App() {
  const [versions, setVersions] = createSignal({
    client: '',
    expectedClient: '',
    extension: '',
  })

  once(fromBackground, 'Versions', v => setVersions(v))

  const { bridge, Devtools } = createDevtools()

  bridge.output.listen(e => toBackground(e.name, e.details))

  fromBackground(e => {
    // some events are internal and should not be forwarded to the devtools
    if (!(e.name in bridge.input)) return
    bridge.input.emit(e.name as any, e.details)
  })

  return (
    <div
      style={{
        position: 'fixed',
        height: '100vh',
        width: '100vw',
        inset: '0',
      }}
    >
      <Devtools
        headerSubtitle={`#${versions().extension}_${versions().client}/${
          versions().expectedClient
        }`}
        errorOverlayFooter={
          <ul>
            <li>Extension: {versions().extension}</li>
            <li>Client: {versions().client}</li>
            <li>Expected client: {versions().expectedClient}</li>
          </ul>
        }
        useShortcuts
        catchWindowErrors
      />
      <MountIcons />
    </div>
  )
}

render(() => <App />, document.getElementById('root')!)
