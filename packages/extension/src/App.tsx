import { createSignal } from 'solid-js'
import { Devtools } from '@solid-devtools/frontend'
import createBridge from './bridge'

export default function App() {
  const [versions, setVersions] = createSignal({
    client: '',
    expectedClient: '',
    extension: '',
  })

  const controller = createBridge({ setVersions })

  return (
    <Devtools
      controller={controller}
      headerSubtitle={`version ${versions().extension}`}
      errorOverlayFooter={
        <ul>
          <li>Extension: {versions().extension}</li>
          <li>Client: {versions().client}</li>
          <li>Expected client: {versions().expectedClient}</li>
        </ul>
      }
    />
  )
}
