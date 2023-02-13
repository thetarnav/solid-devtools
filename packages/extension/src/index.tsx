import { createDevtools, MountIcons } from '@solid-devtools/frontend'
import { Debugger, once } from 'solid-devtools/bridge'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { createPortMessanger, PANEL_CONNECTION_NAME } from './messanger'

import '@solid-devtools/frontend/dist/index.css'

const port = chrome.runtime.connect({ name: PANEL_CONNECTION_NAME })
const { postPortMessage: toBackground, onPortMessage: fromBackground } = createPortMessanger<
  Debugger.OutputChannels,
  Debugger.InputChannels
>(port)

function App() {
  const [versions, setVersions] = createSignal({
    client: '',
    expectedClient: '',
    extension: '',
  })

  // in development — force update the graph on load to work with hot reloading
  if (import.meta.env.DEV) {
    toBackground('ForceUpdate')
  }

  once(fromBackground, 'Versions', v => setVersions(v))

  const { bridge, Devtools } = createDevtools()

  bridge.output.listen(e => toBackground(e.name, e.details))

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  fromBackground(e => bridge.input.emit(e.name as any, e.details))

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
