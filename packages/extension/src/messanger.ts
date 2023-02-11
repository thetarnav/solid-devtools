import { log } from '@solid-devtools/shared/utils'
import { ForwardPayload, OnMessageFn, PostMessageFn } from 'solid-devtools/bridge'

export const CONTENT_CONNECTION_NAME = '[solid-devtools]: Content Script'
export const DEVTOOLS_CONNECTION_NAME = '[solid-devtools]: Devtools Script'
export const POPUP_CONNECTION_NAME = '[solid-devtools]: Popup'
export const PANEL_CONNECTION_NAME = '[solid-devtools]: Devtools Panel'

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
