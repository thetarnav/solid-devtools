/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import { error, log } from '@solid-devtools/shared/utils'
import {
    ConnectionName,
    DetectionState,
    ForwardPayload,
    OnMessageFn,
    PostMessageFn,
    Versions,
    createPortMessanger,
    isForwardMessage,
    once,
} from '../src/bridge'
import { EventBus } from '../src/event-bus'
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

    private disconnectBus = new EventBus()
    private connectListeners = new Set<
        (toContent: PostMessageFn, fromContent: OnMessageFn) => void
    >()

    private toContent: PostMessageFn
    private fromContent: OnMessageFn
    public forwardToDevtools: (fn: (message: ForwardPayload) => void) => void
    public forwardToClient: (message: ForwardPayload) => void

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

    #versions: Versions | undefined
    #versionsBus = new EventBus<Versions>()
    onVersions(fn: (versions: Versions) => void) {
        if (this.#versions) fn(this.#versions)
        else this.#versionsBus.add(fn)
    }
    setVersions(versions: Versions) {
        this.#versions = versions
        this.#versionsBus.emit(versions)
        this.#versionsBus.clear()
    }

    #detected: DetectionState = {
        Solid: false,
        SolidDev: false,
        Devtools: false,
    }
    #detectedListeners = new EventBus<DetectionState>()
    onDetected(fn: (state: DetectionState) => void) {
        fn(this.#detected)
        this.#detectedListeners.add(fn)
    }
    detected(state: DetectionState) {
        this.#detected = state
        this.#detectedListeners.emit(state)
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

    // "Versions" from content-script
    once(fromContent, 'Versions', v => {
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

chrome.runtime.onConnect.addListener(port => {
    switch (port.name) {
        case ConnectionName.Content:
            port.sender?.tab?.id && handleContentScriptConnection(port, port.sender.tab.id)
            break

        case ConnectionName.Devtools:
            withTabData(port, (data, { postPortMessage: toDevtools }) => {
                data.onContentScriptConnect(toContent => {
                    // "Versions" means the devtools client is present
                    data.onVersions(v => toDevtools('Versions', v))

                    port.onDisconnect.addListener(() => toContent('DevtoolsClosed'))
                })
            })
            break

        case ConnectionName.Panel:
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

        case ConnectionName.Popup:
            withTabData(port, (data, { postPortMessage: toPopup }) => {
                data.onVersions(v => toPopup('Versions', v))
                data.onDetected(state => toPopup('Detected', state))
            })
            break
    }
})
