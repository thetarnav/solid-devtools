import '@solid-devtools/debugger/setup'
export * from '@solid-devtools/debugger/setup'

import { setClientVersion, setOwnerLocation, setSolidVersion } from '@solid-devtools/debugger/setup'
import { SET_COMPONENT_LOC_GLOBAL } from './vite/constants'

setClientVersion(process.env.CLIENT_VERSION)
setSolidVersion(process.env.SOLID_VERSION, process.env.EXPECTED_SOLID_VERSION)

const global = globalThis as any

global[SET_COMPONENT_LOC_GLOBAL] = (location: unknown) => {
  if (typeof location !== 'string') return
  setOwnerLocation(location)
}
