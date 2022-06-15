import { ParentComponent, createSignal, onCleanup, Accessor, createMemo } from "solid-js"
import { isProd } from "@solid-primitives/utils"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createGraphRoot } from "./primitives"
import { LocatorOptions, useLocator } from "@solid-devtools/locator"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"

export { makeBatchUpdateListener } from "./batchUpdates"

export type { TargetIDE, TargetURLFunction } from "@solid-devtools/locator"

export type DebuggerLocatorOptions = Omit<LocatorOptions, "components">

export type DebuggerProps = {
	locator?: boolean | DebuggerLocatorOptions
}

function createConsumers(): [
	needed: Accessor<boolean>,
	addConsumer: (consumer: Accessor<boolean>) => void,
] {
	const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([])
	const enabled = createMemo<boolean>(() => consumers().some(consumer => consumer()))
	return [enabled, consumer => setConsumers(p => [...p, consumer])]
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
	// run the debugger only on client in development env
	if (isProd) return props.children

	if (debuggerAlive)
		throw "Currently there can be only one <Debugger> component on the page at once."
	debuggerAlive = true
	onCleanup(() => (debuggerAlive = false))

	const root = getOwner()!

	// setup the debugger in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const [enabled, addDebuggerConsumer] = createConsumers()
		const [trackSignals, addTrackSignalsConsumer] = createConsumers()
		const [trackBatchedUpdates, addTrackBatchedUpdatesConsumer] = createConsumers()
		const [trackComponents, addTrackComponentsConsumer] = createConsumers()

		const [{ rootId, children, components }, { forceUpdate, update }] = createGraphRoot(root, {
			enabled,
			trackSignals,
			trackBatchedUpdates,
			trackComponents,
		})

		{
			const { enabled } = useExtensionAdapter({
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
			addDebuggerConsumer(enabled)
			addTrackSignalsConsumer(enabled)
			addTrackBatchedUpdatesConsumer(enabled)
		}

		if (props.locator) {
			const { enabled } = useLocator({
				...(typeof props.locator === "object" ? props.locator : null),
				components,
			})
			addDebuggerConsumer(enabled)
			addTrackComponentsConsumer(enabled)
		}
	})

	return props.children
}
