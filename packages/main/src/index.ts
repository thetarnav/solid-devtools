import { SolidRoot } from "@shared/graph"
import { attachDebugger, makeCreateRootListener } from "@solid-devtools/debugger"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

makeCreateRootListener(root => {
	attachDebugger(root as SolidRoot)
})

// Extension adapter
useExtensionAdapter()

export {
	Debugger,
	attachDebugger,
	registerDebuggerPlugin,
	makeSolidUpdateListener,
} from "@solid-devtools/debugger"
export type { PluginFactory, TargetIDE, TargetURLFunction } from "@solid-devtools/debugger"

export * from "@solid-devtools/locator"
