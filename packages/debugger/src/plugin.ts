import { BatchUpdateListener, MappedComponent, MappedRoot } from "@shared/graph"
import { createSimpleEmitter } from "@solid-primitives/event-bus"
import { Accessor, createRoot, createSignal, getOwner, runWithOwner } from "solid-js"
import { makeBatchUpdateListener } from "./batchUpdates"
import { createConsumers } from "./utils"

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
	const [components, setComponents] = createSignal<MappedComponent[]>([])

	function registerDebuggerPlugin(
		factory: (data: {
			triggerUpdate: VoidFunction
			forceTriggerUpdate: VoidFunction
			makeBatchUpdateListener: (listener: BatchUpdateListener) => VoidFunction
			roots: Accessor<MappedRoot[]>
			components: Accessor<MappedComponent[]>
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
		trackSignals,
		trackBatchedUpdates,
		trackComponents,
		roots,
		setRoots,
		components,
		setComponents,
		registerDebuggerPlugin,
	}
})
export const {
	onUpdate,
	onForceUpdate,
	triggerUpdate,
	forceTriggerUpdate,
	enabled,
	trackSignals,
	trackBatchedUpdates,
	trackComponents,
	roots,
	setRoots,
	components,
	setComponents,
	registerDebuggerPlugin,
} = exports
