import { FlowComponent, createSignal, createComputed } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"
import { useLocator } from "@solid-devtools/locator"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

export { makeBatchUpdateListener } from "./batchUpdates"
export type { BatchUpdateListener } from "./batchUpdates"

export const Debugger: FlowComponent = props => {
	// run the debugger only on client in development env
	if (isProd) return props.children

	const root = getOwner()!

	// create the graph in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const [enabled, setEnabled] = createSignal(false)
		const [tree, { forceUpdate, update }] = createGraphRoot(root, { enabled })

		const { enabled: extensionAdapterEnabled } = useExtensionAdapter({
			tree,
			forceUpdate,
			update,
			makeBatchUpdateListener,
		})

		const { enabled: locatorEnabled } = useLocator({ components: () => [] })

		createComputed(() => setEnabled(extensionAdapterEnabled() || locatorEnabled()))
	})

	return props.children
}
