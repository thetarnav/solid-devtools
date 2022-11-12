/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import { createCallbackStack, error, log } from '@solid-devtools/shared/utils'
import { once, OnMessageFn, PostMessageFn, Versions } from 'solid-devtools/bridge'
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
}
const tabDataMap = new Map<number, TabData>()

function handleContentScriptConnection(port: chrome.runtime.Port, tabId: number) {
  const { onPortMessage: fromContent, postPortMessage: toContent } = createPortMessanger(port)
  const { push, execute: clearListeners } = createCallbackStack()
  const data: TabData = {
    versions: undefined,
    solidOnPage: false,
    toContent,
    fromContent,
    onContentScriptDisconnect: push,
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
}

function withTabData(
  port: chrome.runtime.Port,
  fn: (data: TabData, from: OnMessageFn, to: PostMessageFn) => void,
): void {
  const data = tabDataMap.get(activeTabId)
  if (!data) return error('No data for active tab', activeTabId)
  const { onPortMessage, postPortMessage } = createPortMessanger(port)
  fn(data, onPortMessage, postPortMessage)
}

function handleDevtoolsConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, fromDevtools, toDevtools) => {
    const { toContent, fromContent, versions } = data
    // "Versions" means the devtools client is present
    if (versions) toDevtools('Versions', versions)
    else once(fromContent, 'Versions', v => toDevtools('Versions', v))

    port.onDisconnect.addListener(() => toContent('DevtoolsClosed'))
  })
}

function handlePanelConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, fromPanel, toPanel) => {
    const { onContentScriptDisconnect: push, toContent, fromContent, versions } = data

    if (versions) toPanel('Versions', versions)
    else once(fromContent, 'Versions', v => toPanel('Versions', v))

    // notify the content script that the devtools panel is ready
    toContent('DevtoolsOpened')

    fromContent('ResetPanel', () => toPanel('ResetPanel'))
    push(() => toPanel('ResetPanel'))

    fromContent('StructureUpdate', e => toPanel('StructureUpdate', e))

    fromContent('ComputationUpdates', e => toPanel('ComputationUpdates', e))
    fromContent('SetInspectedDetails', e => toPanel('SetInspectedDetails', e))
    fromContent('InspectorUpdate', e => toPanel('InspectorUpdate', e))
    fromContent('ClientHoveredComponent', e => toPanel('ClientHoveredComponent', e))
    fromContent('ClientInspectedNode', e => toPanel('ClientInspectedNode', e))

    fromContent('ClientLocatorMode', e => toPanel('ClientLocatorMode', e))
    push(fromPanel('ExtLocatorMode', e => toContent('ExtLocatorMode', e)))

    push(fromPanel('ToggleInspectedValue', e => toContent('ToggleInspectedValue', e)))
    push(fromPanel('SetInspectedNode', e => toContent('SetInspectedNode', e)))

    push(fromPanel('HighlightElement', e => toContent('HighlightElement', e)))

    push(fromPanel('ForceUpdate', () => toContent('ForceUpdate')))
  })
}

function handlePopupConnection(port: chrome.runtime.Port) {
  withTabData(port, (data, fromPopup, toPopup) => {
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
