import { GenericListen, GenericListener } from "@solid-primitives/event-bus"
import { onRootCleanup } from "@solid-primitives/utils"
import { createEffect, createRoot, getOwner, onCleanup } from "solid-js"

// TODO: contribute to @solid-primitives/event-bus

export function createEffectEmitter<Payload>(calc: () => Payload): GenericListen<[Payload]> {
  const owner = getOwner()
  const set = new Set<GenericListener<[Payload]>>()
  let dispose: VoidFunction | undefined
  onCleanup(() => {
    set.clear()
    dispose?.()
    dispose = undefined
  })

  function removeListener(this: GenericListener<[Payload]>) {
    set.delete(this)
    if (set.size === 0) {
      dispose?.()
      dispose = undefined
    }
  }

  return listener => {
    set.add(listener)
    if (!dispose) {
      dispose = createRoot(_dispose => {
        createEffect(() => {
          const payload = calc()
          set.forEach(f => f(payload))
        })
        return _dispose
      }, owner!)
    }
    return onRootCleanup(removeListener.bind(listener))
  }
}
