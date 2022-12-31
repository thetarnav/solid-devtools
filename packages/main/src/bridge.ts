import type {
  ComputationUpdate,
  HighlightElementPayload,
  InspectorUpdate,
  Mapped,
  NodeID,
  SetInspectedNodeData,
  StructureUpdates,
  ToggleInspectedValueData,
  TreeWalkerMode,
} from '@solid-devtools/debugger/types'

export type Versions = { client: string; expectedClient: string; extension: string }

export namespace Messages {
  export interface General {
    // client -> content -> devtools.html
    // the `string` payload is the main version
    SolidOnPage: {}
    ClientConnected: string
    Versions: Versions

    /** devtools -> client: the chrome devtools got opened or entirely closed */
    DevtoolsOpened: {}
    DevtoolsClosed: {}

    ResetPanel: {}
  }

  export interface Client {
    StructureUpdate: StructureUpdates
    ComputationUpdates: ComputationUpdate[]
    InspectorUpdate: InspectorUpdate[]
    /** send component clicked with the locator to the extension */
    ClientInspectedNode: NodeID
    /** send updates to the owner details */
    InspectedDetails: Mapped.OwnerDetails
    /** send hovered (by the locator) owner to the extension */
    HoverComponent: { nodeId: NodeID; state: boolean }

    LocatorMode: boolean
  }

  export interface Extension {
    /** force the debugger to walk the whole tree and send it */
    ForceUpdate: {}
    /** request for node/signal/prop details — subscribe or unsubscribe */
    InspectValue: ToggleInspectedValueData
    InspectNode: SetInspectedNodeData
    HighlightElement: HighlightElementPayload
    /** user is selecting component from the page */
    LocatorMode: boolean
    /** open the location of the inspected component in the code editor */
    OpenLocation: {}
    /** toggle treeview mode */
    TreeViewMode: TreeWalkerMode
  }
}

export type PostMessageFn<M extends { [K in string]: any } = {}> = <
  K extends keyof (Messages.General & M),
>(
  type: K,
  ..._: {} extends (Messages.General & M)[K] ? [] : [payload: (Messages.General & M)[K]]
) => void

export type OnMessageFn<M extends { [K in string]: any } = {}> = <
  K extends keyof (Messages.General & M),
>(
  id: K,
  handler: (payload: (Messages.General & M)[K]) => void,
) => VoidFunction

export const makePostMessage: <M extends { [K in string]: any }>() => PostMessageFn<M> =
  () => (id, payload?: any) =>
    postMessage({ id, payload }, '*')

let onAllMessages: ((data: { id: string; payload: any }) => void) | undefined

const listeners: {
  [K in any]?: ((payload: any) => void)[]
} = {}

/**
 * Important ot call this if you want to use {@link fromContent}
 */
export function startListeningWindowMessages() {
  if (typeof window === 'undefined') return
  addEventListener('message', event => {
    const id = event.data?.id
    if (typeof id !== 'string') return
    const arr = listeners[id]
    if (arr) arr.forEach(f => f(event.data.payload as never))
    else if (onAllMessages) onAllMessages(event.data)
  })
}

export const makeMessageListener: <M extends { [K in string]: any }>() => OnMessageFn<M> =
  () => (id, handler) => {
    let arr = listeners[id]
    if (!arr) arr = listeners[id] = []
    arr.push(handler)
    return () => (listeners[id] = arr!.filter(l => l !== handler) as any)
  }

export type ForwardPayload = { forwarding: true; id: string; payload: any }

export const onAllClientMessages = (fn: (data: { id: string; payload: any }) => void) => {
  onAllMessages = fn
}

export const isForwardMessage = (data: any): data is ForwardPayload =>
  typeof data === 'object' && data !== null && data.forwarding === true && 'id' in data

export const forwardMessageToWindow = (message: ForwardPayload) => {
  postMessage({ id: message.id, payload: message.payload }, '*')
}

export function once<M extends { [K in string]: any }, K extends keyof (Messages.General & M)>(
  method: OnMessageFn<M>,
  id: K,
  handler: (payload: (Messages.General & M)[K]) => void,
): VoidFunction {
  const unsub = method(id, (...cbArgs) => {
    unsub()
    return handler(...cbArgs)
  })
  return unsub
}
