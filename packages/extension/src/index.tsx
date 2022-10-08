import { render } from 'solid-js/web'
import { Devtools } from '@solid-devtools/frontend'

import '@solid-devtools/frontend/dist/index.css'

import { controller } from './bridge'

render(() => <Devtools controller={controller} />, document.getElementById('root')!)
