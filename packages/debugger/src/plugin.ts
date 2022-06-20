import { Accessor, createRoot, createSignal, getOwner, runWithOwner } from "solid-js"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { push, splice } from "@solid-primitives/immutable"
import { BatchUpdateListener, MappedComponent, MappedRoot, SerialisedTreeRoot } from "@shared/graph"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createConsumers } from "./utils"
import { createLazyMemo } from "@solid-primitives/memo"

const exports = createRoot(() => {
	const owner = getOwner()!

	/** throttled global update */
	const [onUpdate, triggerUpdate] = createSimpleEmitter()
	/** forced — immediate global update */
	const [onForceUpdate, forceTriggerUpdate] = createSimpleEmitter()

	const [enabled, addDebuggerConsumer] = createConsumers()
	const [trackSignals, addTrackSignalsConsumer] = createConsumers()
	const [trackBatchedUpdates, addTrackBatchedUpdatesConsumer] = createConsumers()
	const [trackComponents, addTrackComponentsConsumer] = createConsumers()

	const [roots, setRoots] = createSignal<MappedRoot[]>([])

	const components = createLazyMemo<MappedComponent[]>(() =>
		roots().reduce((arr: MappedComponent[], root) => {
			arr.push.apply(arr, root.components)
			return arr
		}, []),
	)

	const serialisedRoots = createLazyMemo<SerialisedTreeRoot[]>(() =>
		roots().map(root => ({
			id: root.id,
			tree: root.tree,
		})),
	)

	const debuggerConfig = {
		get enabled() {
			return enabled()
		},
		get trackSignals() {
			return trackSignals()
		},
		get trackBatchedUpdates() {
			return trackBatchedUpdates()
		},
		get trackComponents() {
			return trackComponents()
		},
	}

	function registerDebuggerPlugin(
		factory: (data: {
			triggerUpdate: VoidFunction
			forceTriggerUpdate: VoidFunction
			makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
			roots: Accessor<MappedRoot[]>
			components: Accessor<MappedComponent[]>
			serialisedRoots: Accessor<SerialisedTreeRoot[]>
		}) => {
			enabled?: Accessor<boolean>
			trackSignals?: Accessor<boolean>
			trackBatchedUpdates?: Accessor<boolean>
			trackComponents?: Accessor<boolean>
		},
	) {
		runWithOwner(owner, () => {
			const { enabled, trackBatchedUpdates, trackComponents, trackSignals } = factory({
				makeBatchUpdateListener,
				roots,
				components,
				triggerUpdate,
				forceTriggerUpdate,
				serialisedRoots,
			})
			enabled && addDebuggerConsumer(enabled)
			trackBatchedUpdates && addTrackBatchedUpdatesConsumer(trackBatchedUpdates)
			trackComponents && addTrackComponentsConsumer(trackComponents)
			trackSignals && addTrackSignalsConsumer(trackSignals)
		})
	}

	return {
		onUpdate,
		onForceUpdate,
		triggerUpdate,
		forceTriggerUpdate,
		enabled,
		debuggerConfig,
		roots,
		setRoots,
		registerDebuggerPlugin,
		updateRoot(root: MappedRoot): void {
			setRoots(arr => {
				const index = arr.findIndex(o => o.id === root.id)
				return index !== -1 ? splice(arr, index, 1, root) : push(arr, root)
			})
		},
		removeRoot(rootId: number): void {
			setRoots(arr => {
				const index = arr.findIndex(o => o.id === rootId)
				return splice(arr, index, 1)
			})
		},
	}
})
export const {
	onUpdate,
	onForceUpdate,
	triggerUpdate,
	forceTriggerUpdate,
	enabled,
	debuggerConfig,
	roots,
	setRoots,
	registerDebuggerPlugin,
	updateRoot,
	removeRoot,
} = exports
