/* @refresh reload */
import { render } from 'solid-js/web'
import 'solid-devtools'
// import { DevtoolsOverlay } from '@solid-devtools/overlay'

import App from './App'
import { ThemeProvider } from './Theme'
import './locator'

import 'uno.css'

export const disposeApp = render(
  () => (
    <>
      <ThemeProvider>
        <App />
      </ThemeProvider>
      {/* <DevtoolsOverlay defaultOpen={true} /> */}
    </>
  ),
  document.getElementById('root')!,
)
