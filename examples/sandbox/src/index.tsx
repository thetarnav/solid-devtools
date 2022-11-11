/* @refresh reload */
import { render } from 'solid-js/web'

let DevtoolsOverlay: typeof import('@solid-devtools/overlay').DevtoolsOverlay | undefined

if (process.env.EXT) {
  import('solid-devtools')
} else {
  DevtoolsOverlay = (await import('@solid-devtools/overlay')).DevtoolsOverlay
}

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
      {DevtoolsOverlay && <DevtoolsOverlay defaultOpen={true} />}
    </>
  ),
  document.getElementById('root')!,
)
