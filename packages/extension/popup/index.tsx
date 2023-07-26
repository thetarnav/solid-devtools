/** @refresh reload */

import { Accessor, Component, JSX, Show, createSignal } from 'solid-js'
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

const Detected: Component<{
    name: keyof DetectionState
    details?: (detected: Accessor<boolean>) => JSX.Element
    children?: JSX.Element
}> = props => {
    const isDetected = () => detectionState()[props.name]
    return (
        <>
            <div>
                <p data-detected={isDetected()}>
                    {DETECTED_TITLES[props.name]} {isDetected() ? 'detected' : 'not detected'}
                </p>
                {props.details && <div class="details">{props.details(isDetected)}</div>}
            </div>
            {isDetected() && props.children}
        </>
    )
}

const App: Component = () => {
    return (
        <Detected name="Solid">
            <Detected name="SolidDev">
                <Detected
                    name="Devtools"
                    details={detected => (
                        <Show when={!detected()}>
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
                        </Show>
                    )}
                />
            </Detected>
            <Show when={versions()} keyed>
                {v => (
                    <div class="versions">
                        <p>Versions:</p>
                        <ul>
                            <li>Solid: {v.solid || 'unknown'}</li>
                            <li>Extension: {v.extension}</li>
                            <li>Client: {v.client || 'unknown'}</li>
                            <li>Expected client: {v.expectedClient}</li>
                        </ul>
                    </div>
                )}
            </Show>
        </Detected>
    )
}

render(() => <App />, document.getElementById('root')!)
