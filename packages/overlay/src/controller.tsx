import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { createDevtools, DevtoolsProps } from '@solid-devtools/frontend'
import { onCleanup } from 'solid-js'

enableRootsAutoattach()

function clone<T>(data: T): T {
  return typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data
}
function separate<T>(data: T, callback: (value: T) => void): void {
  queueMicrotask(() => {
    const v = clone(data)
    queueMicrotask(() => callback(v))
  })
}

export function Devtools(props: DevtoolsProps) {
  const debug = useDebugger()

  debug.emit('ResetState')

  onCleanup(() => debug.emit('InspectNode', null))

  const { bridge, Devtools: Frontend } = createDevtools()

  bridge.output.listen(e => {
    separate(e.details, details => debug.emit(e.name, details as never))
  })

  debug.listen(e => {
    // TODO this should be fixed in the solid-primitives package (allow for passing events straight through)
    separate(e.details, details => bridge.input.emit(e.name, details as never))
  })

  return <Frontend {...props} />
}
