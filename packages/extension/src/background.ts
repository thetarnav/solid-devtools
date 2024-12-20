/*

Background script runs only once, when the extension is installed.
While content-script, popup and devtools scripts run on every page load.
It has to coordinate the communication between the different scripts based on the current activeTabId.

*/

import {error, log} from '@solid-devtools/shared/utils'

import {
    Place_Name, ConnectionName, type Port,
    type DetectionState, type Versions, type Message,
    port_on_message, port_post_message, port_post_message_obj,
    ICONS_BLUE, ICONS_GRAY,
} from './shared.ts'


log(Place_Name.Background+' loaded.')


type Tab_Id = number & {__Tab_Id__: true}

let active_tab_id: Tab_Id = 0 as Tab_Id

chrome.tabs.onActivated.addListener((info) => {
    active_tab_id = info.tabId as Tab_Id
})

/* Get initial tab id */
chrome.tabs
    .query({active: true, currentWindow: true})
    .then(tabs => {
        let id = tabs[0]?.id
        if (id) {
            active_tab_id = id as Tab_Id
        }
    })

function assert(condition: any, message?: string, cause?: any): asserts condition {
    if (!condition) {
        throw Error(message ?? 'Assertion failed', {cause})
    }
}

function get_assert_tab_id(port: Port, place: Place_Name): Tab_Id {
    let tab_id = port.sender?.tab?.id
    assert(tab_id, `${place} has no port sender tab id.`, port)
    return tab_id as Tab_Id
}

type Script_Popup = {
    port:      Port
}
type Script_Panel = {
    tab_id:    Tab_Id
    port:      Port
}
type Script_Devtools = {
    tab_id:    Tab_Id
    port:      Port
}
type Script_Content = {
    tab_id:    Tab_Id
    port:      Port
    detection: DetectionState | null
    versions:  Versions       | null
}

let popup: Script_Popup | undefined

const script_panel_map    = new Map<Tab_Id, Script_Panel>()
const script_devtools_map = new Map<Tab_Id, Script_Devtools>()
const script_content_map  = new Map<Tab_Id, Script_Content>()

chrome.runtime.onConnect.addListener(port => {

    on_connected(port)

    port_on_message(port, e => on_message(port, e))

    port.onDisconnect.addListener(() => on_disconnected(port))
})

function toggle_action_icon(tab_id: Tab_Id) {

    if (script_content_map.get(tab_id)?.detection?.solid) {
        chrome.action.setIcon({tabId: tab_id, path: ICONS_BLUE})

        /*
         For some reason setting the icon immediately does not always work
        */
        setTimeout(() => {
            if (script_content_map.get(tab_id)?.detection?.solid) {
                chrome.action.setIcon({tabId: tab_id, path: ICONS_BLUE})
            } else {
                chrome.action.setIcon({tabId: tab_id, path: ICONS_GRAY})
            }
        }, 600)
    } else {
        chrome.action.setIcon({tabId: tab_id, path: ICONS_GRAY})
    }
}

function on_connected(port: Port) {

    DEV: {log('Port connected', port)}

    switch (port.name) {
    case ConnectionName.Popup: {
        popup = {port}

        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message(popup.port, 'Detected', content.detection)
            port_post_message(popup.port, 'Versions', content.versions)
        }

        break
    }
    case ConnectionName.Content: {
        let tab_id = get_assert_tab_id(port, Place_Name.Content)

        let content: Script_Content = {
            port:      port,
            tab_id:    tab_id,
            detection: null,
            versions:  null,
        }
        script_content_map.set(tab_id, content)

        let panel = script_panel_map.get(tab_id)
        if (panel) {
            port_post_message(content.port, 'DevtoolsOpened', true)
            port_post_message(content.port, 'ResetState', undefined)
        }

        break
    }
    case ConnectionName.Devtools: {

        let devtools: Script_Devtools = {port, tab_id: active_tab_id}
        script_devtools_map.set(active_tab_id, devtools)

        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message(port, 'Versions', content.versions)
        }

        break
    }
    case ConnectionName.Panel: {

        let panel: Script_Panel = {port, tab_id: active_tab_id}
        script_panel_map.set(active_tab_id, panel)

        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message(port, 'Versions', content.versions)

            port_post_message(content.port, 'DevtoolsOpened', true)
            port_post_message(content.port, 'ResetState', undefined)
        }

        break
    }
    }
}

function on_disconnected(port: Port) {

    DEV: {log('Port disconnected', port)}

    switch (port.name) {
    case ConnectionName.Popup: {
        popup = undefined
        break
    }
    case ConnectionName.Content: {
        let tab_id = get_assert_tab_id(port, Place_Name.Content)

        let content = script_content_map.get(tab_id)!
        if (content.port !== port) {
            // Sometimes new Content Script can load before the old disconnects
            return
        }

        script_content_map.delete(tab_id)

        if (popup) {
            port_post_message(popup.port, 'Detected', null)
            port_post_message(popup.port, 'Versions', null)
        }

        let panel = script_panel_map.get(tab_id)
        if (panel) {
            port_post_message(panel.port, 'Versions', null)
            port_post_message(panel.port, 'ResetPanel', undefined)
        }

        let devtools = script_devtools_map.get(tab_id)
        if (devtools) {
            port_post_message(devtools.port, 'Versions', null)
        }

        toggle_action_icon(tab_id)

        break
    }
    case ConnectionName.Devtools: {
        script_devtools_map.delete(active_tab_id)

        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message(content.port, 'DevtoolsOpened', false)
        }

        break
    }
    case ConnectionName.Panel: {
        script_panel_map.delete(active_tab_id)

        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message(content.port, 'DevtoolsOpened', false)
        }

        break
    }
    }
}

function on_message(port: Port, e: Message) {

    DEV: {log('Message', e, 'from', port)}

    switch (port.name) {
    case ConnectionName.Popup: {
        break
    }
    case ConnectionName.Content: {
        let tab_id = get_assert_tab_id(port, Place_Name.Content)

        let content = script_content_map.get(tab_id)
        assert(content)

        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        switch (e.name) {
        case 'Detected': {
            content.detection = e.details

            if (popup) {
                port_post_message_obj(popup.port, e)
            }

            toggle_action_icon(tab_id)

            break
        }
        case 'Versions': {
            content.versions = e.details

            if (popup) {
                port_post_message_obj(popup.port, e)
            }

            let devtools = script_devtools_map.get(tab_id)
            if (devtools) {
                port_post_message_obj(devtools.port, e)
            }

            let panel = script_panel_map.get(tab_id)
            if (panel) {
                port_post_message_obj(panel.port, e)
            }

            break
        }
        default: {
            // Forward all other messages to panel
            let panel = script_panel_map.get(tab_id)
            if (panel) {
                port_post_message_obj(panel.port, e)
            }
        }
        }

        break
    }
    case ConnectionName.Devtools: {
        break
    }
    case ConnectionName.Panel: {

        // Forward all messages to Content
        let content = script_content_map.get(active_tab_id)
        if (content) {
            port_post_message_obj(content.port, e)
        } else {
            error(`Cannot forward ${Place_Name.Panel} -> ${Place_Name.Content} - ${e.name}:`, e.details)
        }

        break
    }
    }
}
