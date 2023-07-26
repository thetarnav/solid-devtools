/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import { error } from '@solid-devtools/shared/utils'
import * as SolidAPI from 'solid-js'
import { $PROXY, DEV, createRoot, getListener, getOwner, onCleanup, untrack } from 'solid-js'
import * as StoreAPI from 'solid-js/store'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import * as WebAPI from 'solid-js/web'
import type { LocatorOptions } from './locator/types'
import { DevEventType, type Solid, type StoredDevEvent } from './main/types'

const OwnerLocationMap = new WeakMap<Solid.Owner, string>()

/**
 * Set the location of the owner in source code.
 * Used by the babel plugin.
 */
export function setOwnerLocation(location: string) {
    const owner = getOwner()
    owner && OwnerLocationMap.set(owner, location)
}

export function getOwnerLocation(owner: Solid.Owner) {
    return OwnerLocationMap.get(owner) ?? null
}

let PassedLocatorOptions: LocatorOptions | null = null
export function useLocator(options: LocatorOptions) {
    PassedLocatorOptions = options
}

let ClientVersion: string | null = null
let SolidVersion: string | null = null
let ExpectedSolidVersion: string | null = null

export function setClientVersion(version: string) {
    ClientVersion = version
}

export function setSolidVersion(version: string, expected: string) {
    SolidVersion = version
    ExpectedSolidVersion = expected
}

let DevEvents: StoredDevEvent[] | null = []

if (window.SolidDevtools$$) {
    error('Debugger is already setup')
}

if (!DEV || !STORE_DEV) {
    error('SolidJS in not in development mode!')
} else {
    window.SolidDevtools$$ = {
        Solid: SolidAPI,
        Store: StoreAPI,
        Web: WebAPI,
        DEV,
        getOwner,
        createRoot,
        getListener,
        onCleanup,
        $PROXY,
        untrack,
        STORE_DEV,
        unwrap,
        getDevEvents() {
            const events = DevEvents ?? []
            DevEvents = null
            return events
        },
        get locatorOptions() {
            return PassedLocatorOptions
        },
        versions: {
            get client() {
                return ClientVersion
            },
            get solid() {
                return SolidVersion
            },
            get expectedSolid() {
                return ExpectedSolidVersion
            },
        },
        getOwnerLocation,
    }

    DEV.hooks.afterCreateOwner = function (owner) {
        if (!DevEvents) return
        DevEvents.push({
            timestamp: Date.now(),
            type: DevEventType.RootCreated,
            data: owner,
        })
    }
}
