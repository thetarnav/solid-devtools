import { attachDebugger, makeCreateRootListener } from "@solid-devtools/debugger"
import "@solid-devtools/ext-adapter"

makeCreateRootListener(root => attachDebugger(root))

export {
  Debugger,
  attachDebugger,
  useDebugger,
  makeSolidUpdateListener,
} from "@solid-devtools/debugger"
export type { PluginData } from "@solid-devtools/debugger"

export { useLocator } from "@solid-devtools/locator"
export type { LocatorOptions, TargetIDE, TargetURLFunction } from "@solid-devtools/locator"
