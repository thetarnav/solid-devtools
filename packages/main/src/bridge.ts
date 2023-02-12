export type Versions = { client: string; expectedClient: string; extension: string }

export interface GeneralMessages {
  // client -> content -> devtools.html
  // the `string` payload is the main version
  SolidOnPage: void
  ClientConnected: string
  Versions: Versions

  /** devtools -> client: the chrome devtools got opened or entirely closed */
  DevtoolsOpened: void
  DevtoolsClosed: void

  ResetPanel: void
}

export type { Debugger } from '@solid-devtools/debugger/types'

export type PostMessageFn<M extends Record<string, any> = {}> = <
  K extends keyof (GeneralMessages & M),
>(
  type: K,
  ..._: void extends (GeneralMessages & M)[K]
    ? [payload?: (GeneralMessages & M)[K]]
    : [payload: (GeneralMessages & M)[K]]
) => void

export type OnMessageFn<M extends Record<string, any> = {}> = {
  <K extends keyof (GeneralMessages & M)>(
    name: K,
    handler: (payload: (GeneralMessages & M)[K]) => void,
  ): VoidFunction
  <K extends keyof (GeneralMessages & M)>(
    handler: (e: { name: K; details: (GeneralMessages & M)[K] }) => void,
  ): VoidFunction
}

export const makePostMessage: <M extends Record<string, any>>() => PostMessageFn<M> =
  () => (name, details?: any) =>
    postMessage({ name, details }, '*')

const listeners: {
  [K in any]?: ((payload: any) => void)[]
} = {}

/**
 * Important ot call this if you want to use
 */
export function startListeningWindowMessages() {
  if (typeof window === 'undefined') return
  addEventListener('message', event => {
    const name = event.data?.name
    if (typeof name !== 'string') return
    const arr = listeners[name]
    if (arr) arr.forEach(f => f(event.data.details as never))
    const arr2 = listeners['*']
    if (arr2) arr2.forEach(f => f({ name, details: event.data.details }))
  })
}

export function makeMessageListener<M extends Record<string, any>>(): OnMessageFn<M> {
  return (...args: [any, any] | [any]) => {
    const name = typeof args[0] === 'string' ? args[0] : '*'
    const handler = typeof args[0] === 'string' ? args[1] : args[0]
    let arr = listeners[name]
    if (!arr) arr = listeners[name] = []
    arr.push(handler)
    return () => (listeners[name] = arr!.filter(l => l !== handler) as any)
  }
}

export type ForwardPayload = { forwarding: true; name: string; details: any }

export const isForwardMessage = (data: any): data is ForwardPayload =>
  typeof data === 'object' && data !== null && data.forwarding === true && 'name' in data

export const forwardMessageToWindow = (message: ForwardPayload) => {
  postMessage({ name: message.name, details: message.details }, '*')
}

export function once<M extends Record<string, any>, K extends keyof (GeneralMessages & M)>(
  method: OnMessageFn<M>,
  name: K,
  handler: (details: (GeneralMessages & M)[K]) => void,
): VoidFunction {
  const unsub = method(name, (...cbArgs) => {
    unsub()
    return handler(...cbArgs)
  })
  return unsub
}
