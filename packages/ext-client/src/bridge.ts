import type {
  InspectorUpdate,
  SetInspectedNodeData,
  ToggleInspectedValueData,
} from '@solid-devtools/debugger'
import type {
  ComputationUpdate,
  HighlightElementPayload,
  Mapped,
  NodeID,
  RootsUpdates,
} from '@solid-devtools/shared/graph'
import { log } from '@solid-devtools/shared/utils'

export const LOG_MESSAGES = false

export interface Messages {
  // client -> content -> devtools.html
  // the `string` payload is the ext-client version
  SolidOnPage: string
  // devtools -> background: number is a tab id
  DevtoolsScriptConnected: number
  DevtoolsPanelConnected: {}
  Versions: { client: string; expectedClient: string; extension: string }
  /** devtools -> client: user switching between Solid devtools and other panel */
  PanelVisibility: boolean
  /** devtools -> client: the chrome devtools got entirely closed */
  PanelClosed: true
  ResetPanel: {}
  StructureUpdate: RootsUpdates
  ComputationUpdates: ComputationUpdate[]
  /** client -> devtools: updates from the inspector */
  InspectorUpdate: InspectorUpdate[]
  /** devtools -> client: force the debugger to walk the whole tree and send it */
  ForceUpdate: {}
  /** client -> devtools: send component clicked with the locator to the extension */
  ClientInspectedNode: NodeID
  /** client -> devtools: send updates to the owner details */
  SetInspectedDetails: Mapped.OwnerDetails
  /** devtools -> client: request for node/signal/prop details — subscribe or unsubscribe */
  ToggleInspectedValue: ToggleInspectedValueData
  SetInspectedNode: SetInspectedNodeData
  /** devtools -> client: user hovered over component/element signal in devtools panel */
  HighlightElement: HighlightElementPayload
  /** client -> devtools: send hovered (by the locator) owner to the extension */
  ClientHoveredComponent: { nodeId: NodeID; state: boolean }
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
  LOG_MESSAGES && log('message posted:', id, payload)
  postMessage({ id, payload }, '*')
}

const listeners: {
  [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
} = {}

/**
 * Important ot call this if you want to use {@link onWindowMessage}
 */
export function startListeningWindowMessages() {
  if (typeof window === 'undefined') return
  addEventListener('message', event => {
    const id = event.data?.id as keyof Messages
    if (typeof id !== 'string') return
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
