/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import { createCallbackStack, error, log } from '@solid-devtools/shared/utils'
import {
  ForwardPayload,
  isForwardMessage,
  once,
  OnMessageFn,
  PostMessageFn,
  Versions,
} from 'solid-devtools/bridge'
import {
  createPortMessanger,
  DEVTOOLS_CONNECTION_NAME,
  CONTENT_CONNECTION_NAME,
  PANEL_CONNECTION_NAME,
  POPUP_CONNECTION_NAME,
} from '../src/messanger'
import icons from '../src/icons'

log('Background script working')

let activeTabId: number = -1
chrome.tabs.onActivated.addListener(({ tabId }) => (activeTabId = tabId))

type TabData = {
  versions: Versions | undefined
  solidOnPage: boolean
  toContent: PostMessageFn
  fromContent: OnMessageFn
  onContentScriptDisconnect: (fn: VoidFunction) => void
  forwardToDevtools: (fn: (message: ForwardPayload) => void) => void
  forwardToClient: (message: ForwardPayload) => void
}
const tabDataMap = new Map<number, TabData>()

function handleContentScriptConnection(port: chrome.runtime.Port, tabId: number) {
  const { onPortMessage: fromContent, postPortMessage: toContent } = createPortMessanger(port)
  const { push, execute: clearListeners } = createCallbackStack()

  let forwardHandler: ((message: ForwardPayload) => void) | undefined

  const data: TabData = {
    versions: undefined,
    solidOnPage: false,
    toContent,
    fromContent,
    onContentScriptDisconnect: push,
    forwardToDevtools: fn => (forwardHandler = fn),
    forwardToClient: message => port.postMessage(message),
  }
  tabDataMap.set(tabId, data)

  // "Versions" from content-script, serves also as a "SolidOnPage" message
  once(fromContent, 'Versions', v => {
    data.versions = v

    // Change the popup icon to indicate that Solid is present on the page
    chrome.action.setIcon({ tabId, path: icons.normal })
  })

  // "SolidOnPage" from content-script (realWorld)
  once(fromContent, 'SolidOnPage', () => (data.solidOnPage = true))

  port.onDisconnect.addListener(() => {
    clearListeners()
    tabDataMap.delete(tabId)
  })

  port.onMessage.addListener((message: ForwardPayload | any) => {
    // HANDLE FORWARDED MESSAGES FROM CLIENT (content-script)
    forwardHandler && isForwardMessage(message) && forwardHandler(message)
  })
}

function withTabData(
  port: chrome.runtime.Port,
  fn: (data: TabData, m: ReturnType<typeof createPortMessanger>) => void,
): void {
  const data = tabDataMap.get(activeTabId)
  if (!data) return error('No data for active tab', activeTabId)
  const m = createPortMessanger(port)
  fn(data, m)
}

function handleDevtoolsConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, { postPortMessage: toDevtools }) => {
    const { toContent, fromContent, versions } = data
    // "Versions" means the devtools client is present
    if (versions) toDevtools('Versions', versions)
    else once(fromContent, 'Versions', v => toDevtools('Versions', v))

    port.onDisconnect.addListener(() => toContent('DevtoolsClosed'))
  })
}

function handlePanelConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, { postPortMessage: toPanel, onForwardMessage }) => {
    const {
      onContentScriptDisconnect: push,
      toContent,
      fromContent,
      versions,
      forwardToClient,
      forwardToDevtools,
    } = data

    if (versions) toPanel('Versions', versions)
    else once(fromContent, 'Versions', v => toPanel('Versions', v))

    // notify the content script that the devtools panel is ready
    toContent('DevtoolsOpened')

    fromContent('ResetPanel', () => toPanel('ResetPanel'))
    push(() => toPanel('ResetPanel'))

    // FORWARD MESSAGES FROM and TO CLIENT
    forwardToDevtools(message => port.postMessage(message))
    onForwardMessage(message => forwardToClient(message))
  })
}

function handlePopupConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, { postPortMessage: toPopup }) => {
    const { fromContent, versions, solidOnPage } = data
    if (versions) toPopup('Versions', versions)
    else if (solidOnPage) {
      toPopup('SolidOnPage')
      once(fromContent, 'Versions', v => toPopup('Versions', v))
    } else {
      once(fromContent, 'Versions', v => toPopup('Versions', v))
      once(fromContent, 'SolidOnPage', () => toPopup('SolidOnPage'))
    }
  })
}

chrome.runtime.onConnect.addListener(port => {
  switch (port.name) {
    case CONTENT_CONNECTION_NAME:
      port.sender?.tab?.id && handleContentScriptConnection(port, port.sender.tab.id)
      break
    case DEVTOOLS_CONNECTION_NAME:
      handleDevtoolsConnection(port)
      break
    case PANEL_CONNECTION_NAME:
      handlePanelConnection(port)
      break
    case POPUP_CONNECTION_NAME:
      handlePopupConnection(port)
      break
  }
})
