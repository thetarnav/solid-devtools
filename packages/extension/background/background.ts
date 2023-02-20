/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import { createCallbackStack, error, log } from '@solid-devtools/shared/utils'
import {
  ConnectionName,
  createPortMessanger,
  ForwardPayload,
  isForwardMessage,
  once,
  OnMessageFn,
  PostMessageFn,
  Versions,
} from '../src/bridge'
import icons from '../src/icons'

log('Background script working.')

let activeTabId: number = -1
chrome.tabs.onActivated.addListener(({ tabId }) => (activeTabId = tabId))

type TabDataConfig = {
  toContent: TabData['toContent']
  fromContent: TabData['fromContent']
  forwardToDevtools: TabData['forwardToDevtools']
  forwardToClient: TabData['forwardToClient']
}

class TabData {
  public connected = true
  public versions: Versions | undefined
  public solidOnPage: boolean = false

  private disconnectListeners = createCallbackStack()
  private connectListeners = new Set<(toContent: PostMessageFn, fromContent: OnMessageFn) => void>()

  public toContent: PostMessageFn
  public fromContent: OnMessageFn
  public forwardToDevtools: (fn: (message: ForwardPayload) => void) => void
  public forwardToClient: (message: ForwardPayload) => void

  constructor(public tabId: number, config: TabDataConfig) {
    this.toContent = config.toContent
    this.fromContent = config.fromContent
    this.forwardToDevtools = config.forwardToDevtools
    this.forwardToClient = config.forwardToClient
  }

  onContentScriptConnect(
    fn: (toContent: PostMessageFn, fromContent: OnMessageFn) => void,
  ): VoidFunction {
    if (this.connected) fn(this.toContent.bind(this), this.fromContent.bind(this))
    this.connectListeners.add(fn)
    return () => this.connectListeners.delete(fn)
  }

  reconnected(config: TabDataConfig) {
    this.toContent = config.toContent
    this.fromContent = config.fromContent
    this.forwardToDevtools = config.forwardToDevtools
    this.forwardToClient = config.forwardToClient

    this.connected = true
    this.connectListeners.forEach(fn => fn(this.toContent.bind(this), this.fromContent.bind(this)))
  }

  onContentScriptDisconnect(fn: VoidFunction): void {
    this.disconnectListeners.push(fn)
  }

  disconnected() {
    this.connected = false
    this.disconnectListeners.execute()
    this.forwardToClient = () => {}
    this.forwardToDevtools = () => {}
  }
}

const tabDataMap = new Map<number, TabData>()

// for reconnecting after page reload
let lastDisconnectedTabData: TabData | undefined
let lastDisconnectedTabId: number | undefined

function handleContentScriptConnection(port: chrome.runtime.Port, tabId: number) {
  const { onPortMessage: fromContent, postPortMessage: toContent } = createPortMessanger(port)

  let forwardHandler: ((message: ForwardPayload) => void) | undefined
  let data: TabData

  const config: TabDataConfig = {
    toContent,
    fromContent,
    forwardToDevtools: fn => (forwardHandler = fn),
    forwardToClient: message => port.postMessage(message),
  }

  // Page was reloaded, so we need to reinitialize the tab data
  if (tabId === lastDisconnectedTabId) {
    data = lastDisconnectedTabData!
    data.reconnected(config)
  }
  // A fresh page
  else {
    data = new TabData(tabId, config)
  }

  lastDisconnectedTabId = undefined
  lastDisconnectedTabId = undefined
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
    data.disconnected()
    tabDataMap.delete(tabId)
    lastDisconnectedTabData = data
    lastDisconnectedTabId = tabId
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
    data.onContentScriptConnect((toContent, fromContent) => {
      // "Versions" means the devtools client is present
      if (data.versions) toDevtools('Versions', data.versions)
      else once(fromContent, 'Versions', v => toDevtools('Versions', v))

      port.onDisconnect.addListener(() => toContent('DevtoolsClosed'))
    })
  })
}

function handlePanelConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, { postPortMessage: toPanel, onForwardMessage }) => {
    data.onContentScriptConnect((toContent, fromContent) => {
      const handleVersions = (v: Versions) => {
        toPanel('Versions', v)
        // notify the content script that the devtools panel is ready
        toContent('DevtoolsOpened')
      }

      if (data.versions) handleVersions(data.versions)
      else once(fromContent, 'Versions', handleVersions)

      fromContent('ResetPanel', () => toPanel('ResetPanel'))
      data.onContentScriptDisconnect(() => toPanel('ResetPanel'))

      // FORWARD MESSAGES FROM and TO CLIENT
      data.forwardToDevtools(message => {
        // console.log('Forwarding to panel', message)
        port.postMessage(message)
      })
      onForwardMessage(message => data.forwardToClient(message))
    })
  })
}

function handlePopupConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, { postPortMessage: toPopup }) => {
    const { fromContent, versions, solidOnPage } = data
    if (versions) toPopup('Versions', versions)
    else if (solidOnPage) {
      toPopup('SolidOnPage')
      once(fromContent.bind(data), 'Versions', v => toPopup('Versions', v))
    } else {
      once(fromContent.bind(data), 'Versions', v => toPopup('Versions', v))
      once(fromContent.bind(data), 'SolidOnPage', () => toPopup('SolidOnPage'))
    }
  })
}

chrome.runtime.onConnect.addListener(port => {
  switch (port.name) {
    case ConnectionName.Content:
      port.sender?.tab?.id && handleContentScriptConnection(port, port.sender.tab.id)
      break
    case ConnectionName.Devtools:
      handleDevtoolsConnection(port)
      break
    case ConnectionName.Panel:
      handlePanelConnection(port)
      break
    case ConnectionName.Popup:
      handlePopupConnection(port)
      break
  }
})
