/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import * as s     from 'solid-js'
import * as store from 'solid-js/store'
import {error} from '@solid-devtools/shared/utils'
import type {LocatorOptions} from './locator/locator.ts'
import type {Solid} from './main/types.ts'


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

export type SetupApi = {
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
    unowned: {
        signals:         WeakRef<Solid.Signal>[]
        onSignalAdded:   ((ref: WeakRef<Solid.Signal>, idx: number) => void) | null
        onSignalRemoved: ((ref: WeakRef<Solid.Signal>, idx: number) => void) | null
    }
}

declare global {
    /** Solid DEV APIs exposed to the debugger by the setup script */
    var SolidDevtools$$: undefined | SetupApi
}

if (globalThis.SolidDevtools$$) {
    error('Debugger is already setup')
}

if (!s.DEV || !store.DEV) {
    error('SolidJS in not in development mode!')
} else {

    let created_owners: Solid.Owner[] | null = []

    let setup: SetupApi = {
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
        unowned: {
            signals:         [],
            onSignalAdded:   null,
            onSignalRemoved: null,
        },
    }
    globalThis.SolidDevtools$$ = setup

    s.DEV.hooks.afterCreateOwner = owner => {
        created_owners?.push(owner)
    }

    let signals_registry = new FinalizationRegistry<WeakRef<Solid.Signal>>(ref => {
        let idx = setup.unowned.signals.indexOf(ref)
        setup.unowned.signals.splice(idx, 1)
        setup.unowned.onSignalRemoved?.(ref, idx)
    })

    s.DEV.hooks.afterCreateSignal = signal => {
        if (s.getOwner() == null) {
            let ref = new WeakRef(signal)
            let idx = setup.unowned.signals.push(ref)-1
            signals_registry.register(signal, ref)
            setup.unowned.onSignalAdded?.(ref, idx)
        }
    }
}
