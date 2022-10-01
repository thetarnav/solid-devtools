import { ComputationUpdate, Mapped, NodeID, RootsUpdates } from "./graph"
import { EncodedValue } from "./serialize"
import { log } from "./utils"

export const LOG_MESSAGES = false

export interface Messages {
  // client -> content -> devtools.html
  // the `string` payload is the ext-client version
  SolidOnPage: string
  // devtools -> background: number is a tab id
  DevtoolsScriptConnected: number
  /** devtools -> client: user switching between Solid devtools and other panel */
  PanelVisibility: boolean
  /** devtools -> client: the chrome devtools got entirely closed */
  PanelClosed: true
  ResetPanel: {}
  GraphUpdate: RootsUpdates
  ComputationUpdates: ComputationUpdate[]
  /** client -> devtools: signal deep value */
  SignalUpdates: { signals: { id: NodeID; value: EncodedValue<boolean> }[]; update: boolean }
  /** client -> devtools: encoded props object */
  PropsUpdate: Mapped.Props
  /** client -> devtools: inspected node value update */
  ValueUpdate: { value: EncodedValue<boolean>; update: boolean }
  /** devtools -> client: force the debugger to walk the whole tree and send it */
  ForceUpdate: {}
  /** devtools -> client: request for details of owner details opened in the side-panel */
  SetSelectedOwner: null | { rootId: NodeID; nodeId: NodeID }
  /** client -> devtools: send component clicked with the locator to the extension */
  SendSelectedOwner: NodeID
  /** client -> devtools: send updates to the owner details */
  OwnerDetailsUpdate: Mapped.OwnerDetails
  /** devtools -> client: request for signal/prop details — subscribe or unsubscribe */
  ToggleInspectedValue:
    | { type: "signal" | "prop"; id: NodeID; selected: boolean }
    | { type: "value"; selected: boolean }
  /** devtools -> client: user hovered over component/element signal in devtools panel */
  HighlightElement: { rootId: NodeID; nodeId: NodeID } | string | null
  /** client -> devtools: send hovered (by the locator) owner to the extension */
  SetHoveredOwner: { nodeId: NodeID; state: boolean }
  /** devtools -> client: user is selecting component from the page */
  ExtLocatorMode: boolean
  /** client -> devtools */
  ClientLocatorMode: boolean
}

export type PostMessageFn = <K extends keyof Messages>(
  type: K,
  ..._: {} extends Messages[K] ? [] : [payload: Messages[K]]
) => void

export type OnMessageFn = <K extends keyof Messages>(
  id: K,
  handler: (payload: Messages[K]) => void,
) => VoidFunction

export const postWindowMessage: PostMessageFn = (id, payload?: any) => {
  LOG_MESSAGES && log("message posted:", id, payload)
  postMessage({ id, payload }, "*")
}

const listeners: {
  [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
} = {}

/**
 * Important ot call this if you want to use {@link onWindowMessage}
 */
export function startListeningWindowMessages() {
  if (typeof window === "undefined") return
  addEventListener("message", event => {
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
