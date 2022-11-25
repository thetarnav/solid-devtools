import { createSignal } from 'solid-js'
import { Devtools, MountIcons } from '@solid-devtools/frontend'
import createBridge from './bridge'

export default function App() {
  const [versions, setVersions] = createSignal({
    client: '',
    expectedClient: '',
    extension: '',
  })

  const controller = createBridge({ setVersions })

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
        controller={controller}
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
