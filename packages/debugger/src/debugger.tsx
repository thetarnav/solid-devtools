import {
	Accessor,
	createContext,
	createMemo,
	createSignal,
	onCleanup,
	ParentComponent,
	useContext,
} from "solid-js"
import { LocatorOptions, useLocator } from "@solid-devtools/locator"
import { createBranch } from "@solid-primitives/rootless"
import { useExtensionAdapter } from "@solid-devtools/extension-adapter"
import { getOwner } from "@shared/graph"
import { createGraphRoot } from "./primitives"
import { makeBatchUpdateListener } from "./batchUpdates"
import { getNewSdtId } from "./utils"

function createConsumers(): [
	needed: Accessor<boolean>,
	addConsumer: (consumer: Accessor<boolean>) => void,
] {
	const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([])
	const enabled = createMemo<boolean>(() => consumers().some(consumer => consumer()))
	return [enabled, consumer => setConsumers(p => [...p, consumer])]
}

export type DebuggerContextState = {
	rootId: number
	update: VoidFunction
	forceUpdate: VoidFunction
}

const DebuggerContext = createContext<DebuggerContextState>()
export const useDebuggerContext = () => useContext(DebuggerContext)

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
	if (debuggerAlive)
		throw "Currently there can be only one <Debugger> component on the page at once."
	debuggerAlive = true
	onCleanup(() => (debuggerAlive = false))

	const root = getOwner()!
	const rootId = getNewSdtId()

	// update and forceUpdate will be populated synchronously
	const ctx = { rootId } as DebuggerContextState

	// setup the debugger in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const [enabled, addDebuggerConsumer] = createConsumers()
		const [trackSignals, addTrackSignalsConsumer] = createConsumers()
		const [trackBatchedUpdates, addTrackBatchedUpdatesConsumer] = createConsumers()
		const [trackComponents, addTrackComponentsConsumer] = createConsumers()

		const [{ children, components }, { forceUpdate, update }] = createGraphRoot(root, rootId, {
			enabled,
			trackSignals,
			trackBatchedUpdates,
			trackComponents,
		})

		ctx.update = update
		ctx.forceUpdate = forceUpdate

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

	return <DebuggerContext.Provider value={ctx}>{props.children}</DebuggerContext.Provider>
}
