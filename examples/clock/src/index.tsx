import { render } from 'solid-js/web'
import { Debugger } from '../../../packages/debugger/src'
import { Clock } from './Clock'
import './styles.css'

render(
  () => (
    <Debugger>
      <Clock />
    </Debugger>
  ),
  document.getElementById('root')!,
)
