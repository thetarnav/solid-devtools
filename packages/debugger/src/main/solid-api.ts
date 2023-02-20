import type { Modify } from '@solid-primitives/utils'
import { Solid } from '../types'

if (!window._$SolidDevAPI)
  throw new Error(
    '[solid-devtools]: Solid API not found. Please make sure you have installed the Solid Devtools extension...',
  )

export default window._$SolidDevAPI as Modify<
  typeof window._$SolidDevAPI,
  {
    getOwner: () => Solid.Owner | null
    getListener: () => Solid.Computation | null
  }
>
