/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import * as s     from 'solid-js'
import * as store from 'solid-js/store'
import * as debug from '@solid-devtools/debugger/types'
import {assert, error} from '@solid-devtools/shared/utils'

/** @deprecated use `setLocatorOptions` */
export function useLocator(options: debug.LocatorOptions) {
    setLocatorOptions(options)
}
export function setLocatorOptions(options: debug.LocatorOptions) {
    assert(globalThis.SolidDevtools$$, 'solid-devtools is not setup')
    globalThis.SolidDevtools$$.locator_options = options
}

export function setDebuggerOptions(options: debug.DebuggerOptions<any>) {
    assert(globalThis.SolidDevtools$$, 'solid-devtools is not setup')
    globalThis.SolidDevtools$$.debugger_options = options
}

export function setClientVersion(version: string) {
    assert(globalThis.SolidDevtools$$, 'solid-devtools is not setup')
    globalThis.SolidDevtools$$.versions.client = version
}

export function setSolidVersion(version: string, expected: string) {
    assert(globalThis.SolidDevtools$$, 'solid-devtools is not setup')
    globalThis.SolidDevtools$$.versions.solid = version
    globalThis.SolidDevtools$$.versions.expected_solid = expected
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
    debugger_options: debug.DebuggerOptions<any>
    locator_options:  debug.LocatorOptions | null
    get_created_owners:  () => debug.Solid.Owner[]
    get_locator_options: () => debug.LocatorOptions | null
    versions: {
        client:             string | null
        solid:              string | null
        expected_solid:     string | null
        get_client:         () => string | null
        get_solid:          () => string | null
        get_expected_solid: () => string | null
    }
    unowned: {
        signals:         WeakRef<debug.Solid.Signal>[]
        onSignalAdded:   ((ref: WeakRef<debug.Solid.Signal>, idx: number) => void) | null
        onSignalRemoved: ((ref: WeakRef<debug.Solid.Signal>, idx: number) => void) | null
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

    let created_owners: debug.Solid.Owner[] | null = []

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
        debugger_options: {
            eli: debug.dom_element_interface,
        },
        locator_options: null,
        get_locator_options() {
            return this.locator_options
        },
        versions: {
            client:              null,
            solid:               null,
            expected_solid:      null,
            get_client()         {return this.client},
            get_solid()          {return this.solid},
            get_expected_solid() {return this.expected_solid},
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

    let signals_registry = new FinalizationRegistry<WeakRef<debug.Solid.Signal>>(ref => {
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
