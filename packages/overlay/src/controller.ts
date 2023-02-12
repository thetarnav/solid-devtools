import { enableRootsAutoattach, useDebugger } from '@solid-devtools/debugger'
import { Controller, createController } from '@solid-devtools/frontend'
import { onCleanup } from 'solid-js'

enableRootsAutoattach()

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj))
const separate = <T>(obj: T, callback: (value: T) => void): void => {
  queueMicrotask(() => {
    const v = clone(obj)
    queueMicrotask(() => callback(v))
  })
}

export function createOverlayController(): Controller {
  const debug = useDebugger()

  onCleanup(() => debug.emit('InspectNode', null))

  const controller = createController()

  controller.devtools.listen(e => {
    separate(e.details, details => debug.emit(e.name, details as never))
  })

  debug.listen(e => {
    // TODO this should be fixed in the solid-primitives package (allow for passing events straight through)
    separate(e.details, details => controller.client.emit(e.name, details as never))
  })

  return controller
}
