import { FlowComponent, createSignal, createComputed, onCleanup } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"
import { useLocator } from "@solid-devtools/locator"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

export { makeBatchUpdateListener } from "./batchUpdates"

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
		const [enabled, setEnabled] = createSignal(false, { internal: true })
		const [trackSignals, setTrackSignals] = createSignal(false, { internal: true })
		const [trackBatchedUpdates, setTrackBatchedUpdates] = createSignal(false, { internal: true })
		const [trackComponents, setTrackComponents] = createSignal(false, { internal: true })

		const [{ rootId, children, components }, { forceUpdate, update }] = createGraphRoot(root, {
			enabled,
			trackSignals,
			trackBatchedUpdates,
			trackComponents,
		})

		const { enabled: extensionAdapterEnabled } = useExtensionAdapter({
			tree: {
				id: rootId,
				get children() {
					return children()
				},
			},
			forceUpdate,
			update,
			makeBatchUpdateListener,
		})

		const { enabled: locatorEnabled } = useLocator({ components })

		createComputed(() => setEnabled(extensionAdapterEnabled() || locatorEnabled()))
		createComputed(() => setTrackSignals(extensionAdapterEnabled))
		createComputed(() => setTrackBatchedUpdates(extensionAdapterEnabled))
		createComputed(() => setTrackComponents(locatorEnabled))
	})

	return props.children
}
