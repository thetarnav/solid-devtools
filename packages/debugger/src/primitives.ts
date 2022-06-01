import { Accessor, createEffect, createSignal } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { MappedOwner, MappedRoot, SolidOwner } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeGraphUpdateListener } from "./update"
import { mapOwnerTree } from "./walker"
import { getNewSdtId } from "./utils"

export type CreateOwnerTreeOptions = {
	enabled?: Accessor<boolean>
	trackSignals?: Accessor<boolean>
	trackBatchedUpdates?: Accessor<boolean>
	trackComponents?: Accessor<boolean>
}

export function boundReturn<T>(this: T): T {
	return this
}

export function createOwnerObserver(
	owner: SolidOwner,
	rootId: number,
	onUpdate: (tree: MappedOwner[]) => void,
	options: CreateOwnerTreeOptions = {},
): {
	update: VoidFunction
	forceUpdate: VoidFunction
} {
	const {
		enabled,
		trackSignals = boundReturn.bind(false),
		trackComponents = boundReturn.bind(false),
		trackBatchedUpdates = boundReturn.bind(false),
	} = options

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
			trackSignals: trackSignals(),
			trackComponents: trackComponents(),
			trackBatchedUpdates: trackBatchedUpdates(),
		})
		onUpdate(tree)
	}
	const update = throttle(forceUpdate, 300)

	if (enabled)
		createEffect(() => {
			if (!enabled()) return
			forceUpdate()
			makeGraphUpdateListener(update)
		})
	else makeGraphUpdateListener(update)

	return { update, forceUpdate }
}

export function createGraphRoot(
	root: SolidOwner,
	options?: CreateOwnerTreeOptions,
): [
	MappedRoot,
	{
		update: VoidFunction
		forceUpdate: VoidFunction
	},
] {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	const id = getNewSdtId()
	const { update, forceUpdate } = createOwnerObserver(root, id, setTree, options)
	update()
	return [
		{
			id,
			get children() {
				return tree()
			},
		},
		{
			update,
			forceUpdate,
		},
	]
}
