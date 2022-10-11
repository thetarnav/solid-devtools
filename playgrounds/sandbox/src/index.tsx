/* @refresh reload */
import { render } from 'solid-js/web'
// import 'solid-devtools'
// import { useLocator } from 'solid-devtools'
import { Overlay } from '@solid-devtools/overlay'
import { useLocator } from '@solid-devtools/locator'

import App from './App'
import { ThemeProvider } from './Theme'

useLocator({
  targetIDE: 'vscode',
})

export const disposeApp = render(
  () => (
    <>
      <ThemeProvider>
        <App />
      </ThemeProvider>
      <Overlay />
    </>
  ),
  document.getElementById('root')!,
)
