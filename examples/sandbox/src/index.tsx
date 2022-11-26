/* @refresh reload */
import { render } from 'solid-js/web'

import App from './App'
import { ThemeProvider } from './Theme'

import 'uno.css'
import './devtools'

export const disposeApp = render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  document.getElementById('root')!,
)
