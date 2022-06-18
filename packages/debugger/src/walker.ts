import {
	MappedOwner,
	OwnerType,
	SolidOwner,
	MappedSignal,
	SolidSignal,
	MappedComponent,
	SolidComputation,
} from "@shared/graph"
import { ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import {
	getOwnerName,
	getSafeValue,
	markNodeID,
	markNodesID,
	markOwnerType,
	resolveChildren,
} from "./utils"
import { observeComputationUpdate, observeValueUpdate } from "./update"

// Globals set before each walker cycle
let RootID: number
let OnSignalUpdate: SignalUpdateHandler
let OnComputationUpdate: ComputationUpdateHandler
let TrackSignals: boolean
let TrackBatchedUpdates: boolean
let TrackComponents: boolean
let Components: MappedComponent[] = []

function observeComputation(owner: SolidOwner, id: number) {
	// TODO: create "isComputation" util
	if (TrackBatchedUpdates && Object.hasOwn(owner, "fn"))
		observeComputationUpdate(
			owner as SolidComputation,
			RootID,
			OnComputationUpdate.bind(void 0, id),
		)
}

function observeValue(node: SolidSignal, id: number) {
	// TODO: create "isSignal" util
	if (TrackBatchedUpdates && Object.hasOwn(node, "value"))
		observeValueUpdate(node, RootID, (value, oldValue) => OnSignalUpdate({ id, value, oldValue }))
}

function createSignalNode(
	raw: Pick<SolidSignal, "name" | "value" | "observers"> & { id: number },
): MappedSignal {
	return {
		name: raw.name,
		id: raw.id,
		observers: markNodesID(raw.observers),
		value: getSafeValue(raw.value),
	}
}

function mapOwnerSignals(owner: SolidOwner): MappedSignal[] {
	if (!owner.sourceMap || !TrackSignals) return []
	return Object.values(owner.sourceMap).map(raw => {
		const id = markNodeID(raw)
		observeValue(raw, id)
		return createSignalNode({ ...raw, id })
	})
}

function mapMemo(mapped: MappedOwner, owner: SolidComputation): MappedOwner {
	const { id, name } = mapped
	observeValue(owner, id)
	return Object.assign(mapped, {
		signal: createSignalNode({ id, name, value: owner.value, observers: owner.observers }),
	})
}

function mapOwner(owner: SolidOwner): MappedOwner {
	const id = markNodeID(owner)
	const type = markOwnerType(owner)
	const name = getOwnerName(owner)

	observeComputation(owner, id)

	if (type === OwnerType.Component && TrackComponents && typeof owner.value === "function") {
		const resolved = resolveChildren(owner.value())
		if (resolved) Components.push({ name, resolved })
	}

	const mapped = {
		id,
		name,
		type,
		signals: mapOwnerSignals(owner),
		children: mapChildren(owner),
		sources: markNodesID(owner.sources),
	}

	return type === OwnerType.Memo ? mapMemo(mapped, owner as SolidComputation) : mapped
}

function mapChildren({ owned, ownedRoots }: Readonly<SolidOwner>): MappedOwner[] {
	const children: MappedOwner[] = []

	if (owned)
		children.push.apply(
			children,
			owned.map(child => mapOwner(child)),
		)

	if (ownedRoots)
		children.push.apply(
			children,
			[...ownedRoots].map(child => mapOwner(child)),
		)

	return children
}

export type WalkerConfig = {
	rootId: number
	onSignalUpdate: SignalUpdateHandler
	onComputationUpdate: ComputationUpdateHandler
	trackSignals: boolean
	trackBatchedUpdates: boolean
	trackComponents: boolean
}

function mapOwnerTree(
	root: SolidOwner,
	config: WalkerConfig,
): { children: MappedOwner[]; components: MappedComponent[] } {
	// set the globals to be available for this walk cycle
	RootID = config.rootId
	OnSignalUpdate = config.onSignalUpdate
	OnComputationUpdate = config.onComputationUpdate
	TrackSignals = config.trackSignals
	TrackBatchedUpdates = config.trackBatchedUpdates
	TrackComponents = config.trackComponents
	if (TrackComponents) Components = []

	return { children: mapChildren(root), components: Components }
}

export { mapOwnerTree }
