/* @refresh reload */
import { render } from 'solid-js/web'

import 'solid-devtools'
import { DevtoolsOverlay } from '@solid-devtools/overlay'
import { useLocator } from '@solid-devtools/debugger'

useLocator({
  targetIDE: 'vscode',
})

import App from './App'
import { ThemeProvider } from './Theme'

import 'uno.css'

export const disposeApp = render(
  () => (
    <>
      <ThemeProvider>
        <App />
      </ThemeProvider>
      {!process.env.EXT && <DevtoolsOverlay defaultOpen={true} />}
    </>
  ),
  document.getElementById('root')!,
)
