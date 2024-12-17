/*

File for utilities, constants and types related to the communication between the different parts of the extension.

*/

import {error, log, log_message} from '@solid-devtools/shared/utils'

export const DEVTOOLS_ID_PREFIX = '[solid-devtools]_'

export const enum Place_Name {
    Content_Script      = 'Content_Script',
    Devtools_Script     = 'Devtools_Script',
    Popup               = 'Popup',
    Panel               = 'Panel',
    Background          = 'Background',
    Debugger_Real_World = 'Debugger_Real_World',
    Detector_Real_World = 'Detector_Real_World',
}

export const enum ConnectionName {
    Content  = DEVTOOLS_ID_PREFIX+Place_Name.Content_Script,
    Devtools = DEVTOOLS_ID_PREFIX+Place_Name.Devtools_Script,
    Popup    = DEVTOOLS_ID_PREFIX+Place_Name.Popup,
    Panel    = DEVTOOLS_ID_PREFIX+Place_Name.Panel,
}

export type DetectionState = {
    Solid:    boolean
    SolidDev: boolean
    Debugger: boolean
}
export const DETECT_MESSAGE = `${DEVTOOLS_ID_PREFIX}DETECT`
export type DetectEvent = {
    name:  typeof DETECT_MESSAGE
    state: DetectionState
}

const LOG_MESSAGES = import.meta.env.DEV
// const LOG_MESSAGES: boolean = true

export interface PortMessanger<
    IM extends {[K in string]: any},
    OM extends {[K in string]: any},
> {
    post:      PostMessageFn<OM>
    on:        OnMessageFn<IM>
    onForward: (handler: (event: ForwardPayload) => void) => void
}

export function createPortMessanger<
    IM extends {[K in string]: any},
    OM extends {[K in string]: any},
>(
    place_name_here: string,
    place_name_conn: string,
    _port: chrome.runtime.Port,
): PortMessanger<IM, OM> {
    let port: chrome.runtime.Port | null = _port

    let forwardHandler: ((event: ForwardPayload) => void) | undefined
    let listeners: {[K in any]?: ((event: any) => void)[]} = {}

    if (LOG_MESSAGES) log(`${place_name_here}-${place_name_conn} port connected.`)

    port.onDisconnect.addListener(() => {
        if (LOG_MESSAGES) log(`${place_name_here}-${place_name_conn} port disconnected.`)
        listeners = {}
        _port.onMessage.removeListener(onMessage)
        port = null
    })

    function onMessage(e: any) {

        if (!e || typeof e !== 'object') return

        let name    = e['name']
        let details = e['details']

        if (typeof name !== 'string') return

        if (LOG_MESSAGES) {log_message(place_name_here, place_name_conn, e)}

        let arr = listeners[name]
        if (arr) {
            for (let fn of arr) fn(details)
        }

        let arr2 = listeners['*']
        if (arr2) {
            for (let fn of arr2) fn({name, details})
        } else if (forwardHandler) {
            forwardHandler({name, details, forwarding: true})
        }
    }
    port.onMessage.addListener(onMessage)

    return {
        post: (name, details?: any) => {
            if (!port) {
                error(`Trying to post ${String(name)} message to disconnected port ${place_name_here}-${place_name_conn}`)
            } else {
                port.postMessage({name, details})
            }
        },
        on: (...args: [any, any] | [any]) => {

            let name    = typeof args[0] === 'string' ? args[0] : '*'
            let handler = typeof args[0] === 'string' ? args[1] : args[0]

            if (!port) {
                error(`Trying to listen to disconnected port ${place_name_here}-${place_name_conn}`)
                return () => {/**/}
            }

            let arr = listeners[name] ?? (listeners[name] = [])
            arr.push(handler)
            
            return () => (listeners[name] = arr.filter(l => l !== handler) as any)
        },
        onForward(handler) {
            forwardHandler = handler
        },
    }
}

export type Versions = {
    client: string | null
    solid: string | null
    expectedClient: string
    extension: string
}

export interface GeneralMessages {
    // client -> content -> devtools.html
    Detected: DetectionState

    // the `string` payload is the main version
    Debugger_Connected: {
        solid:  string | null
        client: string | null
    }
    Versions: Versions

    /** devtools -> client: the chrome devtools got opened or entirely closed */
    DevtoolsOpened: void
    DevtoolsClosed: void

    ResetPanel: void
}

export type PostMessageFn<M extends Record<string, any> = Record<never, never>> = <
    K extends keyof (GeneralMessages & M),
>(
    type: K,
    ..._: void extends (GeneralMessages & M)[K]
        ? [payload?: (GeneralMessages & M)[K]]
        : [payload: (GeneralMessages & M)[K]]
) => void

export type OnMessageFn<M extends Record<string, any> = Record<never, never>> = {
    <K extends keyof (GeneralMessages & M)>(
        name: K,
        handler: (payload: (GeneralMessages & M)[K]) => void,
    ): VoidFunction
    <K extends keyof (GeneralMessages & M)>(
        handler: (e: {name: K; details: (GeneralMessages & M)[K]}) => void,
    ): VoidFunction
}

export const makePostMessage: <M extends Record<string, any>>() => PostMessageFn<M> =
    () => (name, details?: any) =>
        postMessage({name, details}, '*')


const window_listeners: {[K in any]?: ((payload: any) => void)[]} = {}

export function makeMessageListener
    <M extends Record<string, any>>
    (place_name: Place_Name): OnMessageFn<M>
{

    addEventListener('message', e => {
        
        if (!e.data || typeof e.data !== 'object') return

        let name    = e.data['name']
        let details = e.data['details']

        if (typeof name !== 'string') return

        if (LOG_MESSAGES) {log_message(place_name, 'Window', e.data)}

        let arr = window_listeners[name]
        if (arr) {
            for (let fn of arr) fn(details)
        }

        let arr2 = window_listeners['*']
        if (arr2) {
            for (let fn of arr2) fn({name, details})
        }
    })

    return (...args: [any, any] | [any]) => {

        let name    = typeof args[0] === 'string' ? args[0] : '*'
        let handler = typeof args[0] === 'string' ? args[1] : args[0]

        let arr = window_listeners[name] ?? (window_listeners[name] = [])
        arr.push(handler)

        return () => (window_listeners[name] = arr.filter(l => l !== handler) as any)
    }
}

export type ForwardPayload = {forwarding: true; name: string; details: any}

export const isForwardMessage = (data: any): data is ForwardPayload =>
    typeof data === 'object' && data !== null && data.forwarding === true && 'name' in data

export const forwardMessageToWindow = (message: ForwardPayload) => {
    postMessage({name: message.name, details: message.details}, '*')
}

export function once<M extends Record<string, any>, K extends keyof (GeneralMessages & M)>(
    method: OnMessageFn<M>,
    name: K,
    handler: (details: (GeneralMessages & M)[K]) => void,
): VoidFunction {
    const unsub = method(name, (...cbArgs) => {
        unsub()
        return handler(...cbArgs)
    })
    return unsub
}
