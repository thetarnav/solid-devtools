import { attachDebugger, makeCreateRootListener } from "@solid-devtools/debugger"
import { useExtensionAdapter } from "@solid-devtools/ext-adapter"

makeCreateRootListener(root => attachDebugger(root))

// Extension adapter
useExtensionAdapter()

export {
  Debugger,
  attachDebugger,
  registerDebuggerPlugin,
  makeSolidUpdateListener,
} from "@solid-devtools/debugger"
export type { PluginFactory } from "@solid-devtools/debugger"

export { useLocator } from "@solid-devtools/locator"
export type { LocatorOptions, TargetIDE, TargetURLFunction } from "@solid-devtools/locator"
