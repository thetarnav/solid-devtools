/** @refresh reload */

import { batch, Component, createSignal, Show } from 'solid-js'
import { render } from 'solid-js/web'

import { ConnectionName, createPortMessanger, once } from '../src/bridge'

import './popup.css'

// Create a connection to the background page
const port = chrome.runtime.connect({ name: ConnectionName.Popup })
const { onPortMessage: fromBackground } = createPortMessanger(port)

const [solidOnPage, setSolidOnPage] = createSignal(false)
const [versions, setVersions] = createSignal<{
  client: string
  expectedClient: string
  extension: string
}>()

once(fromBackground, 'SolidOnPage', () => setSolidOnPage(true))

// "Versions" mean that devtools client is on the page
once(fromBackground, 'Versions', v => {
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
      {solidOnPage() && (
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
                    href="https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#getting-started"
                    target="_blank"
                  >
                    installation instructions
                  </a>
                  .
                </>
              }
            >
              {v => (
                <ul>
                  <li>Extension: {v.extension}</li>
                  <li>Client: {v.client}</li>
                  <li>Expected client: {v.expectedClient}</li>
                </ul>
              )}
            </Show>
          </div>
        </div>
      )}
    </>
  )
}

render(() => <App />, document.getElementById('root')!)
