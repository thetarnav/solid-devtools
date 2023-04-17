import '@solid-devtools/debugger/setup'
export * from '@solid-devtools/debugger/setup'

import { setClientVersion, setSolidVersion } from '@solid-devtools/debugger/setup'

setClientVersion(process.env.CLIENT_VERSION)
setSolidVersion(process.env.SOLID_VERSION, process.env.EXPECTED_SOLID_VERSION)