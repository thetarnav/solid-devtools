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

type PortMessanger = bridge.PortMessanger<debug.Debugger.InputChannels,
                                          debug.Debugger.OutputChannels>

class TabData {

    id: number = -1

    panel_messanger:    PortMessanger | undefined
    popup_messanger:    PortMessanger | undefined
    devtools_messanger: PortMessanger | undefined

    content:            undefined | {
        messanger:      PortMessanger
        detected_state: bridge.DetectionState | undefined
        versions:       bridge.Versions | undefined
    }
}

const ACTIVE_TAB_QUERY = {active: true, currentWindow: true} as const
const queryActiveTabId = async (): Promise<number | Error> => {
    try {
        let tabs = await chrome.tabs.query(ACTIVE_TAB_QUERY)
        if (tabs.length === 0) return new Error('No active tab')

        let tab = tabs[0]!
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

        let tab: TabData

        // Page was reloaded, so we need to reinitialize the tab data
        if (tab_id === last_disconnected_tab?.id) {
            tab = last_disconnected_tab
        }
        // A fresh page
        else {
            tab = new TabData
        }

        tab.id      = tab_id
        tab.content = {
            messanger:      content_messanger,
            versions:       undefined,
            detected_state: undefined,
        }

        last_disconnected_tab = null

        tab_data_map.set(tab_id, tab)

        panel_and_content_connect(tab)

        // "Versions" from content-script
        bridge.once(content_messanger.on, 'Versions', v => {

            tab.content!.versions = v

            if (tab.devtools_messanger) {
                tab.devtools_messanger.post('Versions', v)
            }

            if (tab.panel_messanger) {
                panel_handle_versions(tab, tab.panel_messanger, v)
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
            tab.content!.detected_state = state
        })

        /* HANDLE FORWARDED MESSAGES FROM CLIENT (content-script) */
        port.onMessage.addListener((e: bridge.ForwardPayload | any) => {
            if (bridge.isForwardMessage(e)) {
                if (tab.panel_messanger) {
                    tab.panel_messanger.post(e.name as any, e.details)
                } else {
                    error(`Cannot forward ${bridge.Place_Name.Content_Script} -> ${bridge.Place_Name.Panel} - ${e.name}:`, e.details)
                }
            }
        })

        /* Content Script Disconnected */
        port.onDisconnect.addListener(() => {

            if (tab.panel_messanger) {
                tab.panel_messanger.post('ResetPanel')
            }

            tab.content = undefined

            tab_data_map.delete(tab_id)

            last_disconnected_tab = tab
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

        if (tab.content && tab.content.versions) {
            devtools_messanger.post('Versions', tab.content.versions)
        }

        /* Devtools Script Disconnected */
        port.onDisconnect.addListener(() => {
            
            tab.devtools_messanger = undefined

            if (tab.content) {
                tab.content.messanger.post('DevtoolsClosed')
            }
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

        panel_and_content_connect(tab)

        // Forward messages from Panel to Content Script (client)
        panel_messanger.onForward(e => {
            if (tab.content) {
                tab.content.messanger.forward(e)
            } else {
                error(`Cannot forward ${bridge.Place_Name.Panel} -> ${bridge.Place_Name.Content_Script} - ${e.name}:`, e.details)
            }
        })

        /* Panel Disconnected */
        port.onDisconnect.addListener(() => {

            tab.panel_messanger = undefined

            if (tab.content) {
                tab.content.messanger.post('DevtoolsClosed')
            }
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

        if (tab.content && tab.content.versions) {
            popup_messanger.post('Versions', tab.content.versions)
        }

        if (tab.content && tab.content.detected_state) {
            popup_messanger.post('Detected', tab.content.detected_state)
        }

        port.onDisconnect.addListener(() => {
            tab.popup_messanger = undefined
        })

        break
    }
    }
})

function panel_handle_versions(tab: TabData, panel_messanger: PortMessanger, versions: bridge.Versions) {

    panel_messanger.post('Versions', versions)

    /* tell client that the devtools panel is ready */
    if (tab.content) {
        tab.content.messanger.post('DevtoolsOpened')
    } else {
        error(`Versions available while ${bridge.Place_Name.Content_Script} not connected.`)
    }
}

/** 
 To be called whenever direct connection between content-script and panel needs to be recreated
 Like when page refreshes or panel gets closed and opened
*/
function panel_and_content_connect(tab: TabData) {

    if (!tab.content || !tab.panel_messanger)
        return

    /* Client is already connected */
    if (tab.content.versions) {
        panel_handle_versions(tab, tab.panel_messanger, tab.content.versions)
    }

    /* Force debugger to send state when panel conects */
    tab.content.messanger.forward({
        name:       'ResetState',
        details:    undefined,
        forwarding: true,
    })
}

