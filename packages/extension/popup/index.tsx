/** @refresh reload */

import { Component, ParentComponent, Show, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { ConnectionName, DetectionState, Versions, createPortMessanger, once } from '../src/bridge'

import './popup.css'

// Create a connection to the background page
const port = chrome.runtime.connect({ name: ConnectionName.Popup })
const { onPortMessage: fromBackground } = createPortMessanger(port)

const [versions, setVersions] = createSignal<Versions | null>(null)
const [detectionState, setDetectionState] = createSignal<DetectionState>({
  Solid: false,
  SolidDev: false,
  Devtools: false,
})

fromBackground('Detected', setDetectionState)
once(fromBackground, 'Versions', setVersions)

const DETECTED_TITLES: Record<keyof DetectionState, string> = {
  Solid: 'Solid',
  SolidDev: 'Solid development mode',
  Devtools: 'Solid Devtools setup',
}

const Detected: ParentComponent<{ name: keyof DetectionState }> = props => {
  const isDetected = () => detectionState()[props.name]
  return (
    <>
      <div>
        <p data-detected={isDetected()}>
          {DETECTED_TITLES[props.name]} {isDetected() ? 'detected' : 'not detected'}
        </p>
      </div>
      <Show when={isDetected()}>{props.children}</Show>
    </>
  )
}

const App: Component = () => {
  return (
    <Detected name="Solid">
      <Detected name="SolidDev">
        <Detected name="Devtools">
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
                  <li>Solid: {v.solid}</li>
                  <li>Extension: {v.extension}</li>
                  <li>Client: {v.client}</li>
                  <li>Expected client: {v.expectedClient}</li>
                </ul>
              )}
            </Show>
          </div>
        </Detected>
      </Detected>
    </Detected>
  )
}

render(() => <App />, document.getElementById('root')!)
