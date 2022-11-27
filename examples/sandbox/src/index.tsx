/* @refresh reload */
import './devtools'

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
