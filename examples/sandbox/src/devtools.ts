import { attachDevtoolsOverlay } from '@solid-devtools/overlay'
import { useLocator } from '@solid-devtools/debugger'

useLocator({
  targetIDE: 'vscode',
})

!process.env.EXT &&
  attachDevtoolsOverlay({
    defaultOpen: true,
    noPadding: true,
  })
