import { mount, StartClient } from 'solid-start/entry-client'
// import { DevtoolsOverlay } from '@solid-devtools/overlay'
import 'solid-devtools'
import { useLocator } from 'solid-devtools'

useLocator({
  targetIDE: 'vscode',
})

mount(
  () => (
    <>
      <StartClient />
      {/* <DevtoolsOverlay defaultOpen /> */}
    </>
  ),
  document,
)
