/** @refresh reload */

import { render } from 'solid-js/web'
import { batch, Component, createSignal, Show } from 'solid-js'

import { createRuntimeMessanger, POPUP_CONNECTION_NAME } from '../shared/messanger'
import { once } from 'solid-devtools/bridge'

import './popup.css'

const { onRuntimeMessage } = createRuntimeMessanger()

// Create a connection to the background page
chrome.runtime.connect({ name: POPUP_CONNECTION_NAME })

const [solidOnPage, setSolidOnPage] = createSignal(false)
const [versions, setVersions] = createSignal<{
  client: string
  expectedClient: string
  extension: string
}>()

once(onRuntimeMessage, 'SolidOnPage', () => setSolidOnPage(true))

// "Versions" mean that devtools client is on the page
once(onRuntimeMessage, 'Versions', v => {
  batch(() => {
    setVersions(v)
    setSolidOnPage(true)
  })
})

const App: Component = () => {
  return (
    <>
      <div>
        <p data-detected={!!solidOnPage()}>Solid {solidOnPage() ? 'detected' : 'not detected'}</p>
      </div>
      <div>
        <p data-detected={!!versions()}>
          Devtools client {versions() ? 'detected' : 'not detected'}
        </p>
        <div class="details">
          <Show
            when={versions()}
            keyed
            fallback={
              <>
                Devtools extension requires a runtime client to be installed. Please follow the{' '}
                <a
                  href="https://github.com/thetarnav/solid-devtools/tree/main/packages/ext-client#getting-started"
                  target="_blank"
                >
                  installation instructions
                </a>
                .
              </>
            }
          >
            {versions => (
              <ul>
                <li>Extension: {versions.extension}</li>
                <li>Client: {versions.client}</li>
                <li>Expected client: {versions.expectedClient}</li>
              </ul>
            )}
          </Show>
        </div>
      </div>
    </>
  )
}

render(() => <App />, document.getElementById('root')!)
