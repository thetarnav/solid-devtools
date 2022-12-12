import { mount, StartClient } from 'solid-start/entry-client'
// import { attachDevtoolsOverlay } from '@solid-devtools/overlay'
// import 'solid-devtools'
import { useLocator } from 'solid-devtools'

useLocator({
  targetIDE: 'vscode',
})

// attachDevtoolsOverlay({})

mount(() => <StartClient />, document)
