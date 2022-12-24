import { enableRootsAutoattach } from '@solid-devtools/debugger'
import './client'

enableRootsAutoattach()

export {
  Debugger,
  attachDebugger,
  useDebugger,
  useLocator,
  makeSolidUpdateListener,
  markComponentLoc,
} from '@solid-devtools/debugger'

export type { LocatorOptions, TargetIDE, TargetURLFunction } from '@solid-devtools/debugger'
