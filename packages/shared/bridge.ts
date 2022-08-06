import { SerialisedTreeRoot } from "./graph"
import { JsonValue, Primitive } from "type-fest"
import { log } from "./utils"

export const LOG_MESSAGES = false

export type SafeValue = JsonValue | Primitive

export interface Messages {
  SolidOnPage: true
  DevtoolsScriptConnected: true
  PanelVisibility: boolean
  ResetPanel: true
  GraphUpdate: {
    added: SerialisedTreeRoot[]
    removed: number[]
    updated: SerialisedTreeRoot[]
  }
  BatchedUpdate: BatchedUpdate[]
  ForceUpdate: true
}

export enum UpdateType {
  Signal,
  Computation,
}

export interface SignalUpdatePayload {
  id: number
  value: SafeValue
  oldValue: SafeValue
}

export type BatchedUpdate =
  | {
      type: UpdateType.Signal
      payload: SignalUpdatePayload
    }
  | {
      type: UpdateType.Computation
      payload: number
    }

export type PostMessageFn = <K extends keyof Messages>(id: K, payload: Messages[K]) => void

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
    listeners[id]?.forEach(f => f(event.data.payload))
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
