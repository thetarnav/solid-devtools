/*

File for utilities, constants and types related to the communication between the different parts of the extension.

*/

import {error, log, log_message} from '@solid-devtools/shared/utils'
import * as debug from '@solid-devtools/debugger/types'

export const DEVTOOLS_ID_PREFIX = '[solid-devtools]_'

export const enum Place_Name {
    Content             = 'Content_Script',
    Devtools            = 'Devtools_Script',
    Popup               = 'Popup',
    Panel               = 'Panel',
    Background          = 'Background',
    Debugger_Real_World = 'Debugger_Real_World',
    Detector_Real_World = 'Detector_Real_World',
}

export const enum ConnectionName {
    Content  = DEVTOOLS_ID_PREFIX+Place_Name.Content,
    Devtools = DEVTOOLS_ID_PREFIX+Place_Name.Devtools,
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
    forward:   (e: ForwardPayload) => void
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

    let forwardHandler: ((e: ForwardPayload) => void) | undefined
    let listeners: {[K in any]?: ((e: any) => void)[]} = {}

    if (LOG_MESSAGES) log(`${place_name_here} <-> ${place_name_conn} port connected.`)

    port.onDisconnect.addListener(() => {
        if (LOG_MESSAGES) log(`${place_name_here} <-> ${place_name_conn} port disconnected.`)
        listeners = {}
        _port.onMessage.removeListener(onMessage)
        port = null
    })

    function onMessage(_e: any) {

        let e = to_message(_e)
        if (!e) return

        if (LOG_MESSAGES) {log_message(place_name_here, place_name_conn, e)}

        let arr = listeners[e.name]
        if (arr) emit(arr, e.details)

        let arr2 = listeners['*']
        if (arr2) emit(arr2, e)
        else if (forwardHandler) {
            forwardHandler({name: e.name, details: e.details, forwarding: true})
        }
    }
    port.onMessage.addListener(onMessage)

    return {
        post: (name, details?: any) => {
            if (!port) {
                error(`Trying to post ${String(name)} to disconnected port ${place_name_here} <-> ${place_name_conn}`)
            } else {
                port.postMessage({name, details})
            }
        },
        on: (...args: [any, any] | [any]) => {

            let name    = typeof args[0] === 'string' ? args[0] : '*'
            let handler = typeof args[0] === 'string' ? args[1] : args[0]

            if (!port) {
                error(`Trying to listen to disconnected port ${place_name_here} <-> ${place_name_conn}`)
                return () => {/**/}
            }

            let arr = listeners[name] ?? (listeners[name] = [])
            arr.push(handler)

            return () => (listeners[name] = arr.filter(l => l !== handler) as any)
        },
        onForward(handler) {
            forwardHandler = handler
        },
        forward(e) {
            if (port) {
                port.postMessage(e)
            } else {
                error(`Trying to forward ${e.name} to disconnected port ${place_name_here} <-> ${place_name_conn}`)
            }
        }
    }
}

export type Versions = {
    client: string | null
    solid: string | null
    expectedClient: string
    extension: string
}

export interface GeneralChannels {
    // client -> content -> devtools.html
    Detected: DetectionState | null

    // the `string` payload is the main version
    Debugger_Connected: {
        solid:  string | null
        client: string | null
    }
    Versions: Versions | null

    /** devtools -> client: the chrome devtools got opened or entirely closed */
    DevtoolsOpened: boolean

    ResetPanel: void
}

export type Channels = debug.Debugger.InputChannels
              & debug.Debugger.OutputChannels
              & GeneralChannels

export type Message = {
    [K in keyof Channels]: {
        name:        K,
        details:     Channels[K],
        forwarding?: boolean,
    }
}[keyof Channels]

export function to_message(e: any): Message | null {
    return e && typeof e === 'object' && typeof e['name'] === 'string'
        ? e
        : null
}

export type PostMessageFn<M extends Record<string, any> = Record<never, never>> = <
    K extends keyof (GeneralChannels & M),
>(
    type: K,
    ..._: void extends (GeneralChannels & M)[K]
        ? [payload?: (GeneralChannels & M)[K]]
        : [payload: (GeneralChannels & M)[K]]
) => void

export type OnMessageFn<M extends Record<string, any> = Record<never, never>> = {
    <K extends keyof (GeneralChannels & M)>(
        name: K,
        handler: (payload: (GeneralChannels & M)[K]) => void,
    ): VoidFunction
    <K extends keyof (GeneralChannels & M)>(
        handler: (e: {name: K; details: (GeneralChannels & M)[K]}) => void,
    ): VoidFunction
}

export const makePostMessage: <M extends Record<string, any>>() => PostMessageFn<M> =
    () => (name, details?: any) =>
        postMessage({name, details}, '*')


const window_listeners: {[K in any]?: ((e: any) => void)[]} = {}

export function makeMessageListener
    <M extends Record<string, any>>
    (place_name: Place_Name): OnMessageFn<M>
{

    addEventListener('message', _e => {

        let e = to_message(_e.data)
        if (!e) return

        if (LOG_MESSAGES) {log_message(place_name, 'Window', e)}

        let arr = window_listeners[e.name]
        if (arr) emit(arr, e.details)

        let arr2 = window_listeners['*']
        if (arr2) emit(arr2, e)
    })

    return (...args: [any, any] | [any]) => {

        let name    = typeof args[0] === 'string' ? args[0] : '*'
        let handler = typeof args[0] === 'string' ? args[1] : args[0]

        let arr = window_listeners[name] ?? (window_listeners[name] = [])
        arr.push(handler)

        return () => (window_listeners[name] = arr.filter(l => l !== handler) as any)
    }
}

export type ForwardPayload = {name: string; details: any; forwarding: true}
export type AnyPayload     = {name: string; details: any}

export const isForwardMessage = (data: any): data is ForwardPayload =>
    typeof data === 'object' && data !== null && data.forwarding === true && 'name' in data

export const forwardMessageToWindow = (message: ForwardPayload) => {
    postMessage({name: message.name, details: message.details}, '*')
}

export function once<M extends Record<string, any>, K extends keyof (GeneralChannels & M)>(
    method: OnMessageFn<M>,
    name: K,
    handler: (details: (GeneralChannels & M)[K]) => void,
): VoidFunction {
    const unsub = method(name, (...cbArgs) => {
        unsub()
        return handler(...cbArgs)
    })
    return unsub
}

export class CallbackSet<T extends any[] = []> extends Set<(...arr: T) => void> {}

export function emit<T extends any[]>(fns: Iterable<(...args: T) => void>, ...args: T): void {
    for (let fn of fns) fn(...args)
}
