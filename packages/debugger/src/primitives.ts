import { createSignal } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { MappedOwner, MappedRoot, SolidOwner } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeGraphUpdateListener } from "./update"
import { mapOwnerTree } from "./walker"
import { getNewSdtId } from "./utils"

export function createOwnerObserver(
	owner: SolidOwner,
	rootId: number,
	onUpdate: (tree: MappedOwner[]) => void,
): {
	update: VoidFunction
	forceUpdate: VoidFunction
} {
	const onComputationUpdate: ComputationUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Computation, payload })
	}
	const onSignalUpdate: SignalUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Signal, payload })
	}
	const forceUpdate = () => {
		const tree = mapOwnerTree(owner, {
			onComputationUpdate,
			onSignalUpdate,
			rootId,
		})
		onUpdate(tree)
	}
	const update = throttle(forceUpdate, 300)
	makeGraphUpdateListener(update)
	return { update, forceUpdate }
}

export function createGraphRoot(root: SolidOwner): [
	root: MappedRoot,
	actions: {
		update: VoidFunction
		forceUpdate: VoidFunction
	},
] {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	const id = getNewSdtId()
	const actions = createOwnerObserver(root, id, setTree)
	return [
		{
			id,
			get children() {
				return tree()
			},
		},
		actions,
	]
}
