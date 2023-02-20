/*

File for utilities, constants and types related to the communication between the different parts of the extension.

*/

import { log } from '@solid-devtools/shared/utils'

export const enum ConnectionName {
  Content = '[solid-devtools]: Content-Script',
  Devtools = '[solid-devtools]: Devtools-Script',
  Popup = '[solid-devtools]: Popup',
  Panel = '[solid-devtools]: Devtools-Panel',
}

export const SOLID_ON_PAGE_MESSAGE = '[solid-devtools]: SOLID_ON_PAGE_MESSAGE'

export function createPortMessanger<
  IM extends { [K in string]: any } = {},
  OM extends { [K in string]: any } = {},
>(
  port: chrome.runtime.Port,
): {
  postPortMessage: PostMessageFn<OM>
  onPortMessage: OnMessageFn<IM>
  onForwardMessage: (handler: (event: ForwardPayload) => void) => void
} {
  let forwardHandler: ((event: ForwardPayload) => void) | undefined
  let listeners: {
    [K in any]?: ((event: any) => void)[]
  } = {}

  let connected = true
  import.meta.env.DEV && log(`${port.name.replace('[solid-devtools]: ', '')} port connected.`)
  port.onDisconnect.addListener(() => {
    import.meta.env.DEV && log(`${port.name.replace('[solid-devtools]: ', '')} port disconnected.`)
    connected = false
    listeners = {}
    port.onMessage.removeListener(onMessage)
  })

  function onMessage(event: unknown) {
    if (!event || typeof event !== 'object') return
    const e = event as Record<PropertyKey, unknown>
    if (typeof e['name'] !== 'string') return
    const arr = listeners[e['name']]
    if (arr) arr.forEach(fn => fn(e['details']))
    const arr2 = listeners['*']
    if (arr2) arr2.forEach(fn => fn({ name: e['name'], details: e['details'] }))
    else if (forwardHandler)
      forwardHandler({ name: e['name'], details: e['details'], forwarding: true })
  }
  port.onMessage.addListener(onMessage)

  return {
    postPortMessage: (name, details?: any) => {
      if (!connected) return
      port.postMessage({ name, details })
    },
    onPortMessage: (...args: [any, any] | [any]) => {
      const name = typeof args[0] === 'string' ? args[0] : '*'
      const handler = typeof args[0] === 'string' ? args[1] : args[0]

      if (!connected) return () => {}
      let arr = listeners[name]
      if (!arr) arr = listeners[name] = []
      arr.push(handler)
      return () => (listeners[name] = arr!.filter(l => l !== handler) as any)
    },
    onForwardMessage(handler) {
      forwardHandler = handler
    },
  }
}

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
