import { resolveElements } from "@solid-primitives/refs"
import {
	MappedOwner,
	NodeType,
	SolidOwner,
	MappedSignal,
	SolidSignal,
	MappedComponent,
	SolidComputation,
	SignalState,
	SolidMemo,
} from "@shared/graph"
import { ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import {
	getOwnerName,
	getSafeValue,
	isSolidComputation,
	markNodeID,
	markNodesID,
	markOwnerType,
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

const WALKER = Symbol("walker")

function observeComputation(owner: SolidOwner, id: number) {
	if (TrackBatchedUpdates && isSolidComputation(owner))
		observeComputationUpdate(owner, OnComputationUpdate.bind(void 0, id))
}

function observeValue(node: SignalState, id: number) {
	// OnSignalUpdate will change
	const handler = OnSignalUpdate
	if (TrackBatchedUpdates)
		observeValueUpdate(node, (value, oldValue) => handler({ id, value, oldValue }), WALKER)
}

function createSignalNode(
	raw: Pick<SolidSignal, "name" | "value" | "observers"> & { id: number },
): MappedSignal {
	return {
		name: raw.name ?? "(anonymous)",
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

function mapMemo(mapped: MappedOwner, owner: SolidMemo): MappedOwner {
	const { id, name } = mapped
	observeValue(owner, id)
	return Object.assign(mapped, {
		signal: createSignalNode({ id, name, value: owner.value, observers: owner.observers }),
	})
}

function mapOwner(owner: SolidOwner, type?: NodeType): MappedOwner {
	type = markOwnerType(owner, type)
	const id = markNodeID(owner)
	const name = getOwnerName(owner)

	observeComputation(owner, id)

	if (type === NodeType.Component && TrackComponents && typeof owner.value === "function") {
		const resolved = resolveElements(owner.value())
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

	return type === NodeType.Memo ? mapMemo(mapped, owner as SolidMemo) : mapped
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
			[...ownedRoots].map(child => mapOwner(child, NodeType.Root)),
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

export function walkSolidTree(
	owner: SolidOwner,
	config: WalkerConfig,
): { tree: MappedOwner; components: MappedComponent[] } {
	// set the globals to be available for this walk cycle
	RootID = config.rootId
	OnSignalUpdate = config.onSignalUpdate
	OnComputationUpdate = config.onComputationUpdate
	TrackSignals = config.trackSignals
	TrackBatchedUpdates = config.trackBatchedUpdates
	TrackComponents = config.trackComponents
	if (TrackComponents) Components = []

	return { tree: mapOwner(owner), components: Components }
}
