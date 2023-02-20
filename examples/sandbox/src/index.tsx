/* @refresh reload */

if (!process.env.EXT) {
  const { attachDevtoolsOverlay } = await import('@solid-devtools/overlay')

  attachDevtoolsOverlay({
    defaultOpen: true,
    noPadding: true,
  })
}

import { render } from 'solid-js/web'

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
