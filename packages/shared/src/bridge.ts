import { JsonValue } from "type-fest"
import { BatchComputationUpdate, NodeID, RootsUpdates } from "./graph"
import { log } from "./utils"

export const LOG_MESSAGES = false

export interface Messages {
  SolidOnPage: void
  DevtoolsScriptConnected: void
  PanelVisibility: boolean
  ResetPanel: void
  GraphUpdate: RootsUpdates
  ComputationsUpdate: BatchComputationUpdate[]
  ForceUpdate: void
  /** devtools -> adapter: request for details of owner details opened in the side-panel */
  SetFocusedOwner: null | { rootId: NodeID; ownerId: NodeID }
}

export interface SignalUpdatePayload {
  id: NodeID
  value: JsonValue
  oldValue: JsonValue
}

export type PostMessageFn = <K extends keyof Messages>(
  ..._: [K] extends [void] ? [id: K] : [id: K, payload: Messages[K]]
) => void

export type OnMessageFn = <K extends keyof Messages>(
  id: K,
  handler: (payload: Messages[K]) => void,
) => VoidFunction

export const postWindowMessage: PostMessageFn = (id, payload?: any) => {
  LOG_MESSAGES && log("message posted:", id, payload)
  window.postMessage({ id, payload }, "*")
}

const listeners: {
  [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
} = {}

/**
 * Important ot call this if you want to use {@link onWindowMessage}
 */
export function startListeningWindowMessages() {
  if (typeof window === "undefined") return
  window.addEventListener("message", event => {
    const id = event.data?.id as keyof Messages
    if (typeof id !== "string") return
    listeners[id]?.forEach(f => f(event.data.payload as never))
  })
}

export const onWindowMessage: OnMessageFn = (id, handler) => {
  let arr = listeners[id]
  if (!arr) arr = listeners[id] = []
  arr.push(handler)
  return () => (listeners[id] = arr!.filter(l => l !== handler) as any)
}

export function once<K extends keyof Messages>(
  method: OnMessageFn,
  id: K,
  handler: (payload: Messages[K]) => void,
): VoidFunction {
  const unsub = method(id, (...cbArgs) => {
    unsub()
    return handler(...cbArgs)
  })
  return unsub
}
