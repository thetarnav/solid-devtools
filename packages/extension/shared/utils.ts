import { MessagePayloads } from "./types"
import { MESSAGE } from "./variables"

export function postMessage<K extends MESSAGE>(id: K, payload: MessagePayloads[K]) {
  console.log("message posted:", MESSAGE[id], payload)
  window.postMessage({ id, payload }, "*")
}

const listeners: Partial<Record<MESSAGE, ((payload: any) => void)[]>> = {}

export function startListeningForPostMessages() {
  window.addEventListener(
    "message",
    event => {
      const id = event.data?.id as MESSAGE
      if (typeof id !== "number") return
      listeners[id]?.forEach(f => f(event.data.payload))
    },
    false
  )
}

export function onMessage<K extends MESSAGE>(
  id: K,
  handler: (payload: MessagePayloads[K]) => void
) {
  let arr = listeners[id]
  if (!arr) arr = listeners[id] = []
  arr.push(handler)
}
