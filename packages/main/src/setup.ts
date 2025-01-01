import '@solid-devtools/debugger/setup'

import {
    setClientVersion,
    setSolidVersion,
    setLocatorOptions,
} from '@solid-devtools/debugger/setup'

setClientVersion(process.env.CLIENT_VERSION)
setSolidVersion(process.env.SOLID_VERSION, process.env.EXPECTED_SOLID_VERSION)

export {setLocatorOptions}
