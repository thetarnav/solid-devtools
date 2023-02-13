import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { createDevtools, DevtoolsProps } from '@solid-devtools/frontend'
import { onCleanup } from 'solid-js'

enableRootsAutoattach()

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
function separate<T>(obj: T, callback: (value: T) => void): void {
  queueMicrotask(() => {
    const v = clone(obj)
    queueMicrotask(() => callback(v))
  })
}

export function Devtools(props: DevtoolsProps) {
  const debug = useDebugger()

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
