import { LOG_MESSAGES, OnMessageFn, PostMessageFn, Messages } from 'solid-devtools/bridge'
import { log } from '@solid-devtools/shared/utils'

export const DEVTOOLS_CONTENT_PORT = 'DEVTOOLS_CONTENT_PORT'
export const DEVTOOLS_CONNECTION_NAME = 'SOLID_DEVTOOLS'

export function createPortMessanger(port: chrome.runtime.Port): {
  postPortMessage: PostMessageFn
  onPortMessage: OnMessageFn
} {
  let listeners: {
    [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
  } = {}

  let connected = true
  port.onDisconnect.addListener(port => {
    log('Port', port.name, 'disconnected')
    connected = false
    listeners = {}
    port.onMessage.removeListener(onMessage)
  })

  function onMessage(event: unknown) {
    if (!event || typeof event !== 'object') return
    const e = event as Record<PropertyKey, unknown>
    if (typeof e.id !== 'string') return
    LOG_MESSAGES && log('port message received:', e.id, e.payload)
    listeners[e.id as keyof Messages]?.forEach(f => f(e.payload as never))
  }
  port.onMessage.addListener(onMessage)

  return {
    postPortMessage: (id, payload?: any) => {
      LOG_MESSAGES && log('port message posted:', id, payload)
      if (!connected) return
      port.postMessage({ id, payload })
    },
    onPortMessage: (id, handler) => {
      if (!connected) return () => {}
      let arr = listeners[id]
      if (!arr) arr = listeners[id] = []
      arr.push(handler)
      return () => (listeners[id] = arr!.filter(l => l !== handler) as any)
    },
  }
}

export function createRuntimeMessanger(): {
  postRuntimeMessage: PostMessageFn
  onRuntimeMessage: OnMessageFn
} {
  const listeners: {
    [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
  } = {}

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const id = message?.id as keyof Messages
    if (typeof id !== 'string') return
    LOG_MESSAGES && log('runtime message received:', id, message.payload)
    listeners[id]?.forEach(f => f(message.payload as never))
    // lines below are necessary to avoid "The message port closed before a response was received." errors.
    // https://github.com/mozilla/webextension-polyfill/issues/130
    sendResponse({})
    return true
  })

  return {
    onRuntimeMessage: (id, handler) => {
      let arr = listeners[id]
      if (!arr) arr = listeners[id] = []
      arr.push(handler)
      return () => (listeners[id] = arr!.filter(l => l !== handler) as any)
    },
    postRuntimeMessage: (id, payload?: any) => {
      LOG_MESSAGES && log('runtime message posted:', id, payload)
      chrome.runtime.sendMessage({ id, payload })
    },
  }
}
