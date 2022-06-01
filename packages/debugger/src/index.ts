import { FlowComponent, createSignal, createComputed, onCleanup } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"
import { useLocator } from "@solid-devtools/locator"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

export { makeBatchUpdateListener } from "./batchUpdates"
export type { BatchUpdateListener } from "./batchUpdates"

let debuggerAlive = false

export const Debugger: FlowComponent = props => {
	// run the debugger only on client in development env
	if (isProd) return props.children

	if (debuggerAlive)
		throw "Currently there can be only one <Debugger> component on the page at once."
	debuggerAlive = true
	onCleanup(() => (debuggerAlive = false))

	const root = getOwner()!

	// create the graph in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const [enabled, setEnabled] = createSignal(false)
		const [trackSignals, setTrackSignals] = createSignal(false)
		const [trackBatchedUpdates, setTrackBatchedUpdates] = createSignal(false)
		const [trackComponents, setTrackComponents] = createSignal(false)

		const [tree, { forceUpdate, update }] = createGraphRoot(root, {
			enabled,
			trackSignals,
			trackBatchedUpdates,
			trackComponents,
		})

		const { enabled: extensionAdapterEnabled } = useExtensionAdapter({
			tree,
			forceUpdate,
			update,
			makeBatchUpdateListener,
		})

		const { enabled: locatorEnabled } = useLocator({ components: () => [] })

		createComputed(() => setEnabled(extensionAdapterEnabled() || locatorEnabled()))
		createComputed(() => setTrackSignals(extensionAdapterEnabled))
		createComputed(() => setTrackBatchedUpdates(extensionAdapterEnabled))
		createComputed(() => setTrackComponents(locatorEnabled))
	})

	return props.children
}
