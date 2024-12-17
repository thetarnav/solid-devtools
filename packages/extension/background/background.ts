/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge from '../shared/bridge.ts'
import * as icons from '../shared/icons.ts'
import * as debug from '@solid-devtools/debugger/types'

log(bridge.Place_Name.Background+' loaded.')

type TabDataConfig = {
    toContent:         bridge.PostMessageFn
    fromContent:       bridge.OnMessageFn
    forwardToDevtools: (fn: (message: bridge.ForwardPayload) => void) => void
    forwardToClient:   (message: bridge.ForwardPayload) => void
}

class TabData {

    connectListeners = new Set<
        (toContent: bridge.PostMessageFn, fromContent: bridge.OnMessageFn) => void
    >()

    panel_messanger: bridge.PortMessanger<debug.Debugger.InputChannels,
                                          debug.Debugger.OutputChannels>
                    | null = null

    popup_messanger: bridge.PortMessanger<debug.Debugger.InputChannels,
                                          debug.Debugger.OutputChannels>
                    | null = null

    detected_state: bridge.DetectionState = {
        Solid:    false,
        SolidDev: false,
        Debugger: false,
    }

    constructor(
        public id: number,
        // null when not connected with content-script
        public config: TabDataConfig | null,
    ) {}

    untilContentScriptConnect(): Promise<{post: bridge.PostMessageFn; on: bridge.OnMessageFn}> {
        return new Promise(resolve => {
            if (this.config) {
                resolve({post: this.config.toContent.bind(this), on: this.config.fromContent.bind(this)})
            } else {
                this.connectListeners.add((toContent, fromContent) => {
                    resolve({post: toContent, on: fromContent})
                })
            }
        })
    }

    reconnected(config: TabDataConfig) {
        this.config = config

        bridge.emit(this.connectListeners, config.toContent.bind(this), config.fromContent.bind(this))
    }

    versions: bridge.Versions | undefined
    versionsBus = new bridge.CallbackSet<[bridge.Versions]>()
    onVersions(fn: (versions: bridge.Versions) => void) {
        if (this.versions) fn(this.versions)
        else this.versionsBus.add(fn)
    }
    setVersions(versions: bridge.Versions) {
        this.versions = versions
        bridge.emit(this.versionsBus, versions)
        this.versionsBus.clear()
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
let last_disconnected_tab: TabData | null = null

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
        let tab: TabData

        const config: TabDataConfig = {
            toContent:         content_messanger.post,
            fromContent:       content_messanger.on,
            forwardToDevtools: fn => (forwardHandler = fn),
            forwardToClient:   message => port.postMessage(message),
        }

        // Page was reloaded, so we need to reinitialize the tab data
        if (tab_id === last_disconnected_tab?.id) {
            tab = last_disconnected_tab
            tab.reconnected(config)
        }
        // A fresh page
        else {
            tab = new TabData(tab_id, config)
        }

        last_disconnected_tab = null
        tab_data_map.set(tab_id, tab)

        // "Versions" from content-script
        bridge.once(content_messanger.on, 'Versions', v => {
            tab.setVersions(v)

            // Change the popup icon to indicate that Solid is present on the page
            chrome.action.setIcon({tabId: tab_id, path: icons.blue})
        })

        // "DetectSolid" from content-script (realWorld)
        content_messanger.on('Detected', state => {
            tab.popup_messanger?.post('Detected', state)
            tab.detected_state = state
        })

        port.onDisconnect.addListener(() => {
            tab.panel_messanger?.post('ResetPanel')
            tab.config = null
            tab_data_map.delete(tab_id)
            last_disconnected_tab = tab
        })

        port.onMessage.addListener((message: bridge.ForwardPayload | any) => {
            // HANDLE FORWARDED MESSAGES FROM CLIENT (content-script)
            forwardHandler && bridge.isForwardMessage(message) && forwardHandler(message)
        })

        break
    }

    case bridge.ConnectionName.Devtools: {
        const tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }
        const devtools_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Devtools_Script,
            port)

        const content_messanger = await tab.untilContentScriptConnect()

        // "Versions" means the devtools client is present
        tab.onVersions(v => devtools_messanger.post('Versions', v))

        port.onDisconnect.addListener(() => {
            content_messanger.post('DevtoolsClosed')
        })

        break
    }

    case bridge.ConnectionName.Panel: {
        const tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }

        const panel_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Panel,
            port)

        tab.panel_messanger = panel_messanger

        const content_messanger = await tab.untilContentScriptConnect()

        tab.onVersions(v => {
            panel_messanger.post('Versions', v)
            // notify the content script that the devtools panel is ready
            content_messanger.post('DevtoolsOpened')
        })

        content_messanger.on('ResetPanel', () => {
            panel_messanger.post('ResetPanel')
        })

        if (!tab.config) {
            error(`No ${bridge.Place_Name.Content_Script} connection when ${bridge.Place_Name.Panel} got connected`)
        } else {
            /* Force debugger to send state when panel conects */
            tab.config.forwardToClient({
                name:       'ResetState',
                details:    undefined,
                forwarding: true, // TODO: this shouldn't be a "forward", but not sure how to typesafe send a post to debugger from here
            })

            // Forward messages from Content Script (client) to Panel
            tab.config.forwardToDevtools(message => {
                port.postMessage(message)
            })
        }

        // Forward messages from Panel to Content Script (client)
        panel_messanger.onForward(message => {
            if (!tab.config) {
                error(`Cannot forward message, no ${bridge.Place_Name.Content_Script} connection.`, message)
            } else {
                tab.config.forwardToClient(message)
            }
        })

        port.onDisconnect.addListener(() => {
            tab.panel_messanger = null
            content_messanger.post('DevtoolsClosed')
        })

        break
    }

    case bridge.ConnectionName.Popup: {
        const tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }
        const popup_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Popup,
            port)
        tab.popup_messanger = popup_messanger

        popup_messanger.post('Detected', tab.detected_state)

        tab.onVersions(v => {
            popup_messanger.post('Versions', v)
        })

        port.onDisconnect.addListener(() => {
            tab.popup_messanger = null
        })

        break
    }
    }
})
