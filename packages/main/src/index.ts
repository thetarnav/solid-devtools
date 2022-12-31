import { enableRootsAutoattach } from '@solid-devtools/debugger'
import './client'

enableRootsAutoattach()

export {
  attachDebugger,
  Debugger,
  makeSolidUpdateListener,
  markComponentLoc,
  useDebugger,
  useLocator,
} from '@solid-devtools/debugger'
export type { LocatorOptions, TargetIDE, TargetURLFunction } from '@solid-devtools/debugger'
