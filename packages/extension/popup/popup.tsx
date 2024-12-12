/** @refresh reload */

import * as s from 'solid-js'
import {render} from 'solid-js/web'
import * as bridge from '../shared/bridge.ts'

import './popup.css'

// Create a connection to the background page
const port = chrome.runtime.connect({name: bridge.ConnectionName.Popup})
const {onPortMessage: fromBackground} = bridge.createPortMessanger(port)

const [versions, setVersions] = s.createSignal<bridge.Versions | null>(null)
const [detectionState, setDetectionState] = s.createSignal<bridge.DetectionState>({
    Solid:    false,
    SolidDev: false,
    Debugger: false,
})

fromBackground('Detected', setDetectionState)
bridge.once(fromBackground, 'Versions', setVersions)

const App: s.Component = () => {
    return <>
        <div>
            <p data-detected={detectionState().Solid}>
                Solid {detectionState().Solid ? 'detected' : 'not detected'}
            </p>
        </div>
        <div>
            <p data-detected={detectionState().SolidDev}>
                Solid Dev Mode {detectionState().SolidDev ? 'detected' : 'not detected'}
            </p>
        </div>
        <div>
            <p data-detected={detectionState().Debugger}>
                Debugger {detectionState().Debugger ? 'detected' : 'not detected'}
            </p>
            <s.Show when={detectionState().SolidDev && !detectionState().Debugger}>
                <div class="details">
                    <p>
                        Devtools extension requires a runtime client to be installed.
                        <br />
                        Please follow the{' '}
                        <a
                            href="https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#getting-started"
                            target="_blank"
                        >
                            installation instructions
                        </a>
                        .
                    </p>
                </div>
            </s.Show>
        </div>
        <s.Show when={versions()} keyed>
        {v => (
            <div class="versions">
                <p>Versions:</p>
                <ul>
                    <li>Solid ___________ {v.solid || 'unknown'}</li>
                    <li>Extension _______ {v.extension}</li>
                    <li>Client found ____ {v.client || 'unknown'}</li>
                    <li>Client expected _ {v.expectedClient}</li>
                </ul>
            </div>
        )}
        </s.Show>
    </>
}

render(() => <App />, document.getElementById('root')!)
