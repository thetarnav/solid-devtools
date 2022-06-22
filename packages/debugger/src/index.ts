import { useExtensionAdapter } from "@solid-devtools/extension-adapter"
import { LocatorOptions, useLocator } from "@solid-devtools/locator"
import { ParentComponent } from "solid-js"
import { registerDebuggerPlugin } from "./plugin"
import { attachDebugger } from "./primitives"

// Extension adapter
registerDebuggerPlugin(({ forceTriggerUpdate, makeBatchUpdateListener, serialisedRoots }) => {
	const { enabled } = useExtensionAdapter({
		roots: serialisedRoots,
		forceTriggerUpdate,
		makeBatchUpdateListener,
	})
	return {
		enabled,
		trackSignals: enabled,
		trackBatchedUpdates: enabled,
	}
})

export type { TargetIDE, TargetURLFunction } from "@solid-devtools/locator"

export { attachDebugger } from "./primitives"

export function useLocatorPlugin(options: Omit<LocatorOptions, "components">) {
	registerDebuggerPlugin(({ components }) => {
		const { enabled } = useLocator({ ...options, components })
		return {
			enabled,
			trackComponents: enabled,
		}
	})
}

export const Debugger: ParentComponent = props => {
	attachDebugger()
	return props.children
}
