/* @refresh reload */
import { render } from 'solid-js/web'

import 'solid-devtools'
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

import App from './App'
import { ThemeProvider } from './Theme'

import 'uno.css'

export const disposeApp = render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  document.getElementById('root')!,
)
