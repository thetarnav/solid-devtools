/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import {error, warn} from '@solid-devtools/shared/utils'
import type {LocatorOptions} from './locator/types.ts'
import type {Solid} from './main/types.ts'

const OwnerLocationMap = new WeakMap<Solid.Owner, string>()

/**
 * Set the location of the owner in source code.
 * Used by the babel plugin.
 */
export function setOwnerLocation(location: string) {
    const owner = Solid$$!.getOwner()
    owner && OwnerLocationMap.set(owner, location)
}

export function getOwnerLocation(owner: Solid.Owner) {
    return OwnerLocationMap.get(owner) ?? null
}

let PassedLocatorOptions: LocatorOptions | null = null
export function useLocator(options: LocatorOptions) {
    PassedLocatorOptions = options
}

let ClientVersion:        string | null = null
let ExpectedSolidVersion: string | null = null

export function setClientVersion(version: string) {
    ClientVersion = version
}
export function setExpectedSolidVersion(expected: string) {
    ExpectedSolidVersion = expected
}
export const setSolidVersion = setExpectedSolidVersion // back compat 0.24.1

declare global {
    /** Solid DEV APIs exposed to the debugger by the setup script */
    var SolidDevtools$$: undefined | {
        get_created_owners(): Solid.Owner[]
        get_locator_options(): LocatorOptions | null
        versions: {
            get_client():         string | null
            get_solid():          string | null
            get_expected_solid(): string | null
        }
        getOwnerLocation: (owner: Solid.Owner) => string | null
    }
}

export function setupSolidDevtools(
    Solid$$:      typeof globalThis.Solid$$,
    SolidStore$$: typeof globalThis.SolidStore$$,
) {

    if (globalThis.SolidDevtools$$) {
        warn('Debugger is already setup')
        return
    }

    if (!globalThis.Solid$$) {
        error('SolidJS in not in development mode!')
    } else {

        let created_owners: Solid.Owner[] | null = []

        globalThis.SolidDevtools$$ = {
            get_created_owners() {
                let owners = created_owners ?? []
                created_owners = null
                return owners
            },
            get_locator_options() {
                return PassedLocatorOptions
            },
            versions: {
                get_client() {
                    return ClientVersion
                },
                get_solid() {
                    return Solid$$!.version
                },
                get_expected_solid() {
                    return ExpectedSolidVersion
                },
            },
            getOwnerLocation,
        }

        Solid$$!.hooks.afterCreateOwner = owner => {
            created_owners?.push(owner)
        }
    }
}
