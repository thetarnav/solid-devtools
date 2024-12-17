/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge from '../shared/bridge.ts'
import * as icons from '../shared/icons.ts'

log(bridge.Place_Name.Background+' loaded.')

type TabDataConfig = {
    toContent:         TabData['toContent']
    fromContent:       TabData['fromContent']
    forwardToDevtools: TabData['forwardToDevtools']
    forwardToClient:   TabData['forwardToClient']
}

type PostMessanger = {post: bridge.PostMessageFn; on: bridge.OnMessageFn}

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

    untilContentScriptConnect(): Promise<PostMessanger> {
        return new Promise(resolve => {
            if (this.connected) {
                resolve({post: this.toContent.bind(this), on: this.fromContent.bind(this)})
            } else {
                this.connectListeners.add((toContent, fromContent) => {
                    resolve({post: toContent, on: fromContent})
                })
            }
        })
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
        this.forwardToClient = () => {
            /**/
        }
        this.forwardToDevtools = () => {
            /**/
        }
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
        Solid:    false,
        SolidDev: false,
        Debugger: false,
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

const ACTIVE_TAB_QUERY = {active: true, currentWindow: true} as const
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

let last_active_tab_id = -1
if (import.meta.env.BROWSER === 'chrome') {
    chrome.tabs.onActivated.addListener(info => {
        last_active_tab_id = info.tabId
    })
}

const tab_data_map = new Map<number, TabData>()

const getActiveTabData = async (): Promise<TabData | Error> => {
    let active_tab_id = last_active_tab_id

    /*
    quering for active data works on chrome too
    but it breaks e2e tests for some reason
    */
    if (import.meta.env.BROWSER === 'firefox') {
        const result = await queryActiveTabId()
        if (result instanceof Error) return result
        active_tab_id = result
    }

    const data = tab_data_map.get(active_tab_id)
    if (!data) return new Error(`No data for active tab "${active_tab_id}"`)

    return data
}

// for reconnecting after page reload
let last_disconnected_tab_data: TabData | undefined
let last_disconnected_tab_id: number | undefined

chrome.runtime.onConnect.addListener(async port => {
    switch (port.name) {
    case bridge.ConnectionName.Content: {
        const tab_id = port.sender?.tab?.id
        if (typeof tab_id !== 'number') break

        const content_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Content_Script,
            port)

        let forwardHandler: ((message: bridge.ForwardPayload) => void) | undefined
        let data: TabData

        const config: TabDataConfig = {
            toContent: content_messanger.postPortMessage,
            fromContent: content_messanger.onPortMessage,
            forwardToDevtools: fn => (forwardHandler = fn),
            forwardToClient: message => port.postMessage(message),
        }

        // Page was reloaded, so we need to reinitialize the tab data
        if (tab_id === last_disconnected_tab_id) {
            data = last_disconnected_tab_data!
            data.reconnected(config)
        }
        // A fresh page
        else {
            data = new TabData(tab_id, config)
        }

        last_disconnected_tab_id = undefined
        last_disconnected_tab_id = undefined
        tab_data_map.set(tab_id, data)

        // "Versions" from content-script
        bridge.once(content_messanger.onPortMessage, 'Versions', v => {
            data.setVersions(v)

            // Change the popup icon to indicate that Solid is present on the page
            chrome.action.setIcon({tabId: tab_id, path: icons.blue})
        })

        // "DetectSolid" from content-script (realWorld)
        content_messanger.onPortMessage('Detected', state => data.detected(state))

        port.onDisconnect.addListener(() => {
            data.disconnected()
            tab_data_map.delete(tab_id)
            last_disconnected_tab_data = data
            last_disconnected_tab_id = tab_id
        })

        port.onMessage.addListener((message: bridge.ForwardPayload | any) => {
            // HANDLE FORWARDED MESSAGES FROM CLIENT (content-script)
            forwardHandler && bridge.isForwardMessage(message) && forwardHandler(message)
        })

        break
    }

    case bridge.ConnectionName.Devtools: {
        const data = await getActiveTabData()
        if (data instanceof Error) {
            error(data)
            break
        }
        const devtools_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Devtools_Script,
            port)

        const content_messanger = await data.untilContentScriptConnect()

        // "Versions" means the devtools client is present
        data.onVersions(v => devtools_messanger.postPortMessage('Versions', v))

        port.onDisconnect.addListener(() => content_messanger.post('DevtoolsClosed'))

        break
    }

    case bridge.ConnectionName.Panel: {
        const data = await getActiveTabData()
        if (data instanceof Error) {
            error(data)
            break
        }
        const panel_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Panel,
            port)

        const content_messanger = await data.untilContentScriptConnect()

        data.onVersions(v => {
            panel_messanger.postPortMessage('Versions', v)
            // notify the content script that the devtools panel is ready
            content_messanger.post('DevtoolsOpened')
        })

        content_messanger.on('ResetPanel', () => {
            panel_messanger.postPortMessage('ResetPanel')
        })
        data.onContentScriptDisconnect(() => {
            panel_messanger.postPortMessage('ResetPanel')
        })

        /* Force debugger to send state when panel conects */
        data.forwardToClient({
            name:       'ResetState',
            details:    undefined,
            forwarding: true, // TODO: this shouldn't be a "forward", but not sure how to typesafe send a post to debugger from here
        })

        // FORWARD MESSAGES FROM and TO CLIENT
        data.forwardToDevtools(message => {
            port.postMessage(message)
        })
        panel_messanger.onForwardMessage(message => {
            data.forwardToClient(message)
        })

        break
    }

    case bridge.ConnectionName.Popup: {
        const data = await getActiveTabData()
        if (data instanceof Error) {
            error(data)
            break
        }
        const popup_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Popup,
            port)

        data.onVersions(v => {
            popup_messanger.postPortMessage('Versions', v)
        })
        data.onDetected(state => {
            popup_messanger.postPortMessage('Detected', state)
        })

        break
    }
    }
})
