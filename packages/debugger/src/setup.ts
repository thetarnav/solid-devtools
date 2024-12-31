/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import * as s     from 'solid-js'
import * as store from 'solid-js/store'
import {error} from '@solid-devtools/shared/utils'
import type {LocatorOptions} from './locator/types.ts'
import type {Solid} from './main/types.ts'

const OwnerLocationMap = new WeakMap<Solid.Owner, string>()

/**
 * Set the location of the owner in source code.
 * Used by the babel plugin.
 */
export function setOwnerLocation(location: string) {
    const owner = s.getOwner()
    owner && OwnerLocationMap.set(owner, location)
}

export function getOwnerLocation(owner: Solid.Owner) {
    return OwnerLocationMap.get(owner) ?? null
}

let PassedLocatorOptions: LocatorOptions | null = null
/** @deprecated use `setLocatorOptions` */
export function useLocator(options: LocatorOptions) {
    PassedLocatorOptions = options
}
export function setLocatorOptions(options: LocatorOptions) {
    PassedLocatorOptions = options
}

let ClientVersion:        string | null = null
let SolidVersion:         string | null = null
let ExpectedSolidVersion: string | null = null

export function setClientVersion(version: string) {
    ClientVersion = version
}

export function setSolidVersion(version: string, expected: string) {
    SolidVersion = version
    ExpectedSolidVersion = expected
}

declare global {
    /** Solid DEV APIs exposed to the debugger by the setup script */
    var SolidDevtools$$: undefined | {
        solid: NonNullable<typeof s.DEV> & {
            getOwner:     typeof s.getOwner
            getListener:  typeof s.getListener
            untrack:      typeof s.untrack
            $PROXY:       typeof s.$PROXY
            $TRACK:       typeof s.$TRACK
            $DEVCOMP:     typeof s.$DEVCOMP
            sharedConfig: typeof s.sharedConfig
        }
        store: NonNullable<typeof store.DEV> & {
            unwrap:       typeof store.unwrap
            $RAW:         typeof store.$RAW
        }
        // custom
        get_created_owners():  Solid.Owner[]
        get_locator_options(): LocatorOptions | null
        versions: {
            get_client():         string | null
            get_solid():          string | null
            get_expected_solid(): string | null
        }
        get_owner_location(owner: Solid.Owner): string | null
    }
}

if (window.SolidDevtools$$) {
    error('Debugger is already setup')
}

if (!s.DEV || !store.DEV) {
    error('SolidJS in not in development mode!')
} else {

    let created_owners: Solid.Owner[] | null = []

    window.SolidDevtools$$ = {
        solid: {
            ...s.DEV,
            getOwner:     s.getOwner,
            getListener:  s.getListener,
            untrack:      s.untrack,
            $PROXY:       s.$PROXY,
            $TRACK:       s.$TRACK,
            $DEVCOMP:     s.$DEVCOMP,
            sharedConfig: s.sharedConfig,
        },
        store: {
            ...store.DEV,
            unwrap:       store.unwrap,
            $RAW:         store.$RAW,
        },
        get_created_owners() {
            const events = created_owners ?? []
            created_owners = null
            return events
        },
        get_locator_options() {
            return PassedLocatorOptions
        },
        versions: {
            get_client()         {return ClientVersion},
            get_solid()          {return SolidVersion},
            get_expected_solid() {return ExpectedSolidVersion},
        },
        get_owner_location: getOwnerLocation,
    }

    s.DEV.hooks.afterCreateOwner = owner => {
        created_owners?.push(owner)
    }
}
