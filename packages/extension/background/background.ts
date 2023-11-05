/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import { error, log } from '@solid-devtools/shared/utils'
import * as bridge from '../shared/bridge'
import { icons } from '../shared/icons'

log('Background script working.')

type TabDataConfig = {
    toContent: TabData['toContent']
    fromContent: TabData['fromContent']
    forwardToDevtools: TabData['forwardToDevtools']
    forwardToClient: TabData['forwardToClient']
}

class EventBus<T> extends Set<(payload: T) => void> {
    emit(..._: void extends T ? [payload?: T] : [payload: T]): void
    emit(payload?: any) {
        for (const cb of this) cb(payload)
    }
}

class TabData {
    public connected = true

    private disconnectBus = new EventBus()
    private connectListeners = new Set<
        (toContent: bridge.PostMessageFn, fromContent: bridge.OnMessageFn) => void
    >()

    private toContent: bridge.PostMessageFn
    private fromContent: bridge.OnMessageFn
    public forwardToDevtools: (fn: (message: bridge.ForwardPayload) => void) => void
    public forwardToClient: (message: bridge.ForwardPayload) => void

    constructor(
        public tabId: number,
        config: TabDataConfig,
    ) {
        this.toContent = config.toContent
        this.fromContent = config.fromContent
        this.forwardToDevtools = config.forwardToDevtools
        this.forwardToClient = config.forwardToClient
    }

    onContentScriptConnect(
        fn: (toContent: bridge.PostMessageFn, fromContent: bridge.OnMessageFn) => void,
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
        this.connectListeners.forEach(fn =>
            fn(this.toContent.bind(this), this.fromContent.bind(this)),
        )
    }

    onContentScriptDisconnect(fn: VoidFunction): void {
        this.disconnectBus.add(fn)
    }

    disconnected() {
        this.connected = false
        this.disconnectBus.emit()
        this.disconnectBus.clear()
        this.forwardToClient = () => {}
        this.forwardToDevtools = () => {}
    }

    #versions: bridge.Versions | undefined
    #versionsBus = new EventBus<bridge.Versions>()
    onVersions(fn: (versions: bridge.Versions) => void) {
        if (this.#versions) fn(this.#versions)
        else this.#versionsBus.add(fn)
    }
    setVersions(versions: bridge.Versions) {
        this.#versions = versions
        this.#versionsBus.emit(versions)
        this.#versionsBus.clear()
    }

    #detected: bridge.DetectionState = {
        Solid: false,
        SolidDev: false,
        Devtools: false,
    }
    #detectedListeners = new EventBus<bridge.DetectionState>()
    onDetected(fn: (state: bridge.DetectionState) => void) {
        fn(this.#detected)
        this.#detectedListeners.add(fn)
    }
    detected(state: bridge.DetectionState) {
        this.#detected = state
        this.#detectedListeners.emit(state)
    }
}

const tabDataMap = new Map<number, TabData>()

// for reconnecting after page reload
let lastDisconnectedTabData: TabData | undefined
let lastDisconnectedTabId: number | undefined

function handleContentScriptConnection(port: chrome.runtime.Port, tabId: number) {
    const { onPortMessage: fromContent, postPortMessage: toContent } =
        bridge.createPortMessanger(port)

    let forwardHandler: ((message: bridge.ForwardPayload) => void) | undefined
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

    // "Versions" from content-script
    bridge.once(fromContent, 'Versions', v => {
        data.setVersions(v)

        // Change the popup icon to indicate that Solid is present on the page
        chrome.action.setIcon({ tabId, path: icons.normal })
    })

    // "DetectSolid" from content-script (realWorld)
    fromContent('Detected', state => data.detected(state))

    port.onDisconnect.addListener(() => {
        data.disconnected()
        tabDataMap.delete(tabId)
        lastDisconnectedTabData = data
        lastDisconnectedTabId = tabId
    })

    port.onMessage.addListener((message: bridge.ForwardPayload | any) => {
        // HANDLE FORWARDED MESSAGES FROM CLIENT (content-script)
        forwardHandler && bridge.isForwardMessage(message) && forwardHandler(message)
    })
}

const ACTIVE_TAB_QUERY = { active: true, currentWindow: true } as const
const queryActiveTabId = async (): Promise<number | Error> => {
    try {
        const tabs = await chrome.tabs.query(ACTIVE_TAB_QUERY)
        if (tabs.length === 0) return new Error('No active tab')
        const tab = tabs[0]!
        if (!tab.id) return new Error('Active tab has no id')
        return tab.id
    } catch (e) {
        return e instanceof Error ? e : new Error('Unknown error')
    }
}

const withTabData = async (
    port: chrome.runtime.Port,
    callback: (data: TabData, m: ReturnType<typeof bridge.createPortMessanger>) => void,
): Promise<void> => {
    const active_tab_id = await queryActiveTabId()
    if (active_tab_id instanceof Error) {
        error(active_tab_id)
        return
    }

    const data = tabDataMap.get(active_tab_id)
    if (!data) {
        error('No data for active tab', active_tab_id, 'when connecing', port.name)
        return
    }

    callback(data, bridge.createPortMessanger(port))
}

chrome.runtime.onConnect.addListener(port => {
    switch (port.name) {
        case bridge.ConnectionName.Content:
            port.sender?.tab?.id && handleContentScriptConnection(port, port.sender.tab.id)
            break

        case bridge.ConnectionName.Devtools:
            withTabData(port, (data, { postPortMessage: toDevtools }) => {
                data.onContentScriptConnect(toContent => {
                    // "Versions" means the devtools client is present
                    data.onVersions(v => toDevtools('Versions', v))

                    port.onDisconnect.addListener(() => toContent('DevtoolsClosed'))
                })
            })
            break

        case bridge.ConnectionName.Panel:
            withTabData(port, (data, { postPortMessage: toPanel, onForwardMessage }) => {
                data.onContentScriptConnect((toContent, fromContent) => {
                    data.onVersions(v => {
                        toPanel('Versions', v)
                        // notify the content script that the devtools panel is ready
                        toContent('DevtoolsOpened')
                    })

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
            break

        case bridge.ConnectionName.Popup:
            withTabData(port, (data, { postPortMessage: toPopup }) => {
                data.onVersions(v => toPopup('Versions', v))
                data.onDetected(state => toPopup('Detected', state))
            })
            break
    }
})
