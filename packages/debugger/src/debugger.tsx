import { onCleanup, ParentComponent } from "solid-js"
import { LocatorOptions, useLocator } from "@solid-devtools/locator"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"
import { getOwner } from "@shared/graph"
import { createGraphRoot } from "./primitives"
import { registerDebuggerPlugin } from "./plugin"

export type DebuggerLocatorOptions = Omit<LocatorOptions, "components">

export type DebuggerProps = {
	locator?: boolean | DebuggerLocatorOptions
}

let debuggerAlive = false

/**
 * Debugger is a cornerstone of all solid-devtools. It analyses and tracks changes of Solid's reactive graph.
 * Wrap your application with it to use compatable devtools.
 *
 * @see https://github.com/thetarnav/solid-devtools#available-devtools
 *
 * @param props
 */
export const Debugger: ParentComponent<DebuggerProps> = props => {
	if (debuggerAlive) throw "There can be only one <Debugger> component on the page at once."
	debuggerAlive = true
	onCleanup(() => (debuggerAlive = false))

	createGraphRoot(getOwner()!)

	// Extension adapter
	registerDebuggerPlugin(({ forceTriggerUpdate, makeBatchUpdateListener, roots }) => {
		const { enabled } = useExtensionAdapter({
			roots,
			forceTriggerUpdate,
			makeBatchUpdateListener,
		})
		return {
			enabled,
			trackSignals: enabled,
			trackBatchedUpdates: enabled,
		}
	})

	// Locator
	if (props.locator) {
		registerDebuggerPlugin(({ components }) => {
			const { enabled } = useLocator({
				...(typeof props.locator === "object" ? props.locator : null),
				components,
			})
			return {
				enabled,
				trackComponents: enabled,
			}
		})
	}

	return props.children
}
