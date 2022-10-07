import { render } from 'solid-js/web'
import { Clock } from './Clock'
import './styles.css'
import { Debugger } from '../../../packages/debugger/src'

render(
  () => (
    <Debugger>
      <Clock />
    </Debugger>
  ),
  document.getElementById('root')!,
)
