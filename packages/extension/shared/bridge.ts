import { noop } from "@solid-primitives/utils"
import { LOG_MESSAGES, Messages, OnMessageFn, PostMessageFn } from "@shared/bridge"
import { log } from "@shared/utils"

export const DEVTOOLS_CONTENT_PORT = "DEVTOOLS_CONTENT_PORT"

export function createPortMessanger(port: chrome.runtime.Port): {
  postPortMessage: PostMessageFn
  onPortMessage: OnMessageFn
} {
  let listeners: {
    [K in keyof Messages]?: ((payload: Messages[K]) => void)[]
  } = {}

  let connected = true
  port.onDisconnect.addListener(port => {
    log("Port", port.name, "disconnected")
    connected = false
    listeners = {}
    port.onMessage.removeListener(onMessage)
  })

  function onMessage(event: unknown, port: chrome.runtime.Port) {
    if (!event || typeof event !== "object") return
    const e = event as Record<PropertyKey, unknown>
    if (typeof e.id !== "string") return
    const id = e.id as keyof Messages
    LOG_MESSAGES && log("port message received:", id, e.payload)
    listeners[id]?.forEach(f => f(e.payload as any))
  }
  port.onMessage.addListener(onMessage)

  return {
    postPortMessage: (id, payload?: any) => {
      LOG_MESSAGES && log("port message posted:", id, payload)
      if (!connected) return
      port.postMessage({ id, payload })
    },
    onPortMessage: (id, handler) => {
      if (!connected) return noop
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
    if (typeof id !== "string") return
    LOG_MESSAGES && log("runtime message received:", id, message.payload)
    listeners[id]?.forEach(f => f(message.payload))
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
      LOG_MESSAGES && log("runtime message posted:", id, payload)
      chrome.runtime.sendMessage({ id, payload })
    },
  }
}
