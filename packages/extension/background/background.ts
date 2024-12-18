/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import {error, log} from '@solid-devtools/shared/utils'
import * as bridge  from '../shared/bridge.ts'
import * as icons   from '../shared/icons.ts'
import * as debug   from '@solid-devtools/debugger/types'

log(bridge.Place_Name.Background+' loaded.')

type TabDataConfig = {
    toContent:         bridge.PostMessageFn
    fromContent:       bridge.OnMessageFn
    forwardToDevtools: (fn: (message: bridge.ForwardPayload) => void) => void
    forwardToClient:   (message: bridge.ForwardPayload) => void
}

class TabData {

    id: number = -1

    /** null when not connected with content-script */
    config: TabDataConfig | undefined

    connectListeners = new Set<
        (toContent: bridge.PostMessageFn, fromContent: bridge.OnMessageFn) => void
    >()

    panel_messanger:    bridge.PortMessanger<debug.Debugger.InputChannels,
                                             debug.Debugger.OutputChannels>
                        | undefined

    popup_messanger:    bridge.PortMessanger<debug.Debugger.InputChannels,
                                             debug.Debugger.OutputChannels>
                        | undefined
    
    devtools_messanger: bridge.PortMessanger<debug.Debugger.InputChannels,
                                             debug.Debugger.OutputChannels>
                        | undefined

    detected_state: bridge.DetectionState = {
        Solid:    false,
        SolidDev: false,
        Debugger: false,
    }

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

const tab_data_map = new Map<number, TabData>()

const getActiveTabData = async (): Promise<TabData | Error> => {

    let active_tab_id = await queryActiveTabId()
    if (active_tab_id instanceof Error) return active_tab_id

    let data = tab_data_map.get(active_tab_id)
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
            tab        = new TabData
            tab.id     = tab_id
            tab.config = config
        }

        last_disconnected_tab = null
        tab_data_map.set(tab_id, tab)

        // "Versions" from content-script
        bridge.once(content_messanger.on, 'Versions', v => {

            tab.versions = v

            if (tab.devtools_messanger) {
                tab.devtools_messanger.post('Versions', v)
            }

            if (tab.panel_messanger) {
                tab.panel_messanger.post('Versions', v)
                /* notify the content script that the devtools panel is already open */
                content_messanger.post('DevtoolsOpened')
            }

            if (tab.popup_messanger) {
                tab.popup_messanger.post('Versions', v)
            }

            /* Change the popup icon to indicate that Solid is present on the page */
            chrome.action.setIcon({tabId: tab_id, path: icons.blue})
        })

        /* "DetectSolid" from content-script (realWorld) */
        content_messanger.on('Detected', state => {
            tab.popup_messanger?.post('Detected', state)
            tab.detected_state = state
        })

        port.onDisconnect.addListener(() => {
            tab.panel_messanger?.post('ResetPanel')
            tab.config = undefined
            tab_data_map.delete(tab_id)
            last_disconnected_tab = tab
        })

        port.onMessage.addListener((message: bridge.ForwardPayload | any) => {
            /* HANDLE FORWARDED MESSAGES FROM CLIENT (content-script) */
            forwardHandler && bridge.isForwardMessage(message) && forwardHandler(message)
        })

        break
    }

    case bridge.ConnectionName.Devtools: {
        let tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }
        let devtools_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Devtools_Script,
            port)
        tab.devtools_messanger = devtools_messanger

        if (tab.versions) {
            devtools_messanger.post('Versions', tab.versions)
        }

        let content_messanger = await tab.untilContentScriptConnect()

        port.onDisconnect.addListener(() => {
            content_messanger.post('DevtoolsClosed')
        })

        break
    }

    case bridge.ConnectionName.Panel: {
        let tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }

        let panel_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Panel,
            port)
        tab.panel_messanger = panel_messanger

        let content_messanger = await tab.untilContentScriptConnect()

        if (tab.versions) {
            panel_messanger.post('Versions', tab.versions)
            /* notify the content script that the devtools panel is ready */
            content_messanger.post('DevtoolsOpened')
        }

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
            tab.panel_messanger = undefined
            content_messanger.post('DevtoolsClosed')
        })

        break
    }

    case bridge.ConnectionName.Popup: {
        let tab = await getActiveTabData()
        if (tab instanceof Error) {
            error(tab)
            break
        }
        let popup_messanger = bridge.createPortMessanger(
            bridge.Place_Name.Background,
            bridge.Place_Name.Popup,
            port)
        tab.popup_messanger = popup_messanger

        if (tab.versions) {
            popup_messanger.post('Versions', tab.versions)
        }

        popup_messanger.post('Detected', tab.detected_state)

        port.onDisconnect.addListener(() => {
            tab.popup_messanger = undefined
        })

        break
    }
    }
})
