import { render } from 'solid-js/web'
import { ErrorOverlay } from '@/ui'

import './state'
import './bridge'

import App from './App'

render(
  () => (
    <ErrorOverlay>
      <App />
    </ErrorOverlay>
  ),
  document.getElementById('root')!,
)
