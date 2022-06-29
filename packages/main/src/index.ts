import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

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
