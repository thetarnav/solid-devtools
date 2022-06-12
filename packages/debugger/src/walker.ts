import {
	MappedOwner,
	OwnerType,
	SolidOwner,
	MappedSignal,
	ValueUpdateListener,
	SolidSignal,
	MappedComponent,
} from "@shared/graph"
import { ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { getOwnerName, getSafeValue, markNodeID, markNodesID, markOwnerType } from "./utils"
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
	if (TrackBatchedUpdates)
		observeComputationUpdate(owner, RootID, OnComputationUpdate.bind(void 0, id))
}

function observeValue(
	node: {
		value: unknown
		onSignalUpdate?: Record<number, ValueUpdateListener> | undefined
	},
	id: number,
) {
	if (TrackBatchedUpdates)
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

/**
 * Creates a copy of `sourceMap` without duplicated signals. (after computation rerun, signals are duplicated in sourceMap)
 */
function dedupeSourceMap(
	sourceMap: Readonly<Record<string, SolidSignal>>,
): Record<string, SolidSignal> {
	const map: Record<string, SolidSignal> = {}
	for (let name in sourceMap) {
		const signal = sourceMap[name]
		const match = name.match(/(.*)-\d+(?!.)/)
		if (match) name = signal.name = match[1]
		map[name] = signal
	}
	return map
}

function mapOwnerSignals(owner: SolidOwner): MappedSignal[] {
	if (!owner.sourceMap || !TrackSignals) return []
	const map = (owner.sourceMap = dedupeSourceMap(owner.sourceMap))
	return Object.values(map).map(raw => {
		const id = markNodeID(raw)
		observeValue(raw, id)
		return createSignalNode({ ...raw, id })
	})
}

function mapMemo(mapped: MappedOwner, owner: SolidOwner): MappedOwner {
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
		const v = owner.value()
		// ! HTMLElements aren't JSON serialisable
		if (v instanceof HTMLElement) Components.push({ name, element: v })
	}

	const mapped = {
		id,
		name,
		type,
		signals: mapOwnerSignals(owner),
		children: mapChildren(owner),
		sources: markNodesID(owner.sources),
	}

	return type === OwnerType.Memo ? mapMemo(mapped, owner) : mapped
}

function mapChildren(owner: Readonly<SolidOwner>): MappedOwner[] {
	if (!Array.isArray(owner.owned)) return []
	return owner.owned.map(child => mapOwner(child))
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
