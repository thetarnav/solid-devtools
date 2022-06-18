import { Accessor, createEffect, createSignal, onCleanup, runWithOwner, untrack } from "solid-js"
import type { Owner } from "solid-js/types/reactive/signal"
import { throttle } from "@solid-primitives/scheduled"
import { getOwner, MappedComponent, MappedOwner, SolidOwner } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeRootUpdateListener } from "./update"
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
	onUpdate: (children: MappedOwner[], components: MappedComponent[]) => void,
	options: CreateOwnerTreeOptions = {},
): {
	update: VoidFunction
	forceUpdate: VoidFunction
	rootId: number
} {
	const {
		enabled,
		trackSignals = boundReturn.bind(false),
		trackComponents = boundReturn.bind(false),
		trackBatchedUpdates = boundReturn.bind(false),
	} = options

	const rootId = getNewSdtId()

	const onComputationUpdate: ComputationUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Computation, payload })
	}
	const onSignalUpdate: SignalUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Signal, payload })
	}
	const forceUpdate = () => {
		const { children, components } = untrack(
			mapOwnerTree.bind(void 0, owner, {
				onComputationUpdate,
				onSignalUpdate,
				rootId,
				trackSignals: trackSignals(),
				trackComponents: trackComponents(),
				trackBatchedUpdates: trackBatchedUpdates(),
			}),
		)
		onUpdate(children, components)
	}
	const update = throttle(forceUpdate, 350)

	if (enabled)
		createEffect(() => {
			if (!enabled()) return
			forceUpdate()
			makeRootUpdateListener(rootId, update)
		})
	else makeRootUpdateListener(rootId, update)

	return { update, forceUpdate, rootId }
}

export function createGraphRoot(
	root: SolidOwner,
	options?: CreateOwnerTreeOptions,
): [
	{
		rootId: number
		children: Accessor<MappedOwner[]>
		components: Accessor<MappedComponent[]>
	},
	{
		update: VoidFunction
		forceUpdate: VoidFunction
	},
] {
	const [children, setChildren] = createSignal<MappedOwner[]>([], { internal: true })
	const [components, setComponents] = createSignal<MappedComponent[]>([], { internal: true })

	const { update, forceUpdate, rootId } = createOwnerObserver(
		root,
		(children, components) => {
			setChildren(children)
			setComponents(components)
		},
		options,
	)
	update()

	return [
		{ rootId, children, components },
		{ update, forceUpdate },
	]
}

/**
 * Helps the debugger find and reattach an reactive owner created by `createRoot` to it's detached parent.
 *
 * Call this synchronously inside `createRoot` callback body, whenever you are using `createRoot` yourself to dispose of computations early, or inside `<For>`/`<Index>` components to reattach their children to reactive graph visible by the devtools debugger.
 * @example
 * createRoot(dispose => {
 * 	// This reactive Owner disapears form the owner tree
 *
 * 	// Reattach the Owner to the tree:
 * 	reattachOwner();
 * });
 */
export function reattachOwner(): void {
	let owner = getOwner()
	if (!owner)
		return console.warn(
			"reatachOwner helper should be used synchronously inside createRoot callback body.",
		)

	// find the detached root — user could be calling reattachOwner from inside a futher computation
	while (owner.owner?.owned?.includes(owner)) owner = owner.owner
	const parent = owner.owner

	// attach to parent
	if (parent) {
		const ownedRoots = parent.ownedRoots ?? (parent.ownedRoots = new Set())
		ownedRoots.add(owner)
		runWithOwner(owner as Owner, () => onCleanup(() => ownedRoots.delete(owner!)))
	}
	// attach to UNOWNED
	else {
		// TODO
	}
}
