import * as solid from 'solid-js'
import * as store from 'solid-js/store'
import {
    setClientVersion,
    setOwnerLocation,
    setExpectedSolidVersion,
    useLocator,
    setupSolidDevtools,
} from '@solid-devtools/debugger/setup'

setupSolidDevtools(solid.DEV, store.DEV)

setClientVersion(process.env.CLIENT_VERSION)
setExpectedSolidVersion(process.env.EXPECTED_SOLID_VERSION)

/**
 * Set debugger locator module options.
 * Used by the `solid-devtools` plugin.
 */
export function setComponentLocation(location: string): void {
    if (typeof location !== 'string') return
    setOwnerLocation(location)
}

export {useLocator as setLocatorOptions}
