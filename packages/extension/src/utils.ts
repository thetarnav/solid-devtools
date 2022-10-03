import { createSignal, onCleanup } from "solid-js"
import { Listen } from "@solid-primitives/event-bus"

/**
 * Creates a signal that will be activated for a given amount of time on every "ping" — a call to the listener function.
 */
export function createPingedSignal(listen: Listen, timeout = 400) {
  const [isUpdated, setIsUpdated] = createSignal(false)

  let timeoutId: NodeJS.Timeout | undefined
  onCleanup(() => clearTimeout(timeoutId))
  listen(() => {
    setIsUpdated(true)
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => setIsUpdated(false), 400)
  })

  return isUpdated
}
