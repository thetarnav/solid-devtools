import { Accessor, createEffect, createSignal, untrack } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { getOwner, MappedComponent, MappedOwner, SolidOwner } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeRootUpdateListener } from "./update"
import { mapOwnerTree } from "./walker"
import { useDebuggerContext } from "./debugger"
import { onOwnerCleanup } from "./utils"

export type CreateOwnerTreeOptions = {
	enabled?: Accessor<boolean>
	trackSignals?: Accessor<boolean>
	trackBatchedUpdates?: Accessor<boolean>
	trackComponents?: Accessor<boolean>
}

const falseFn = () => false

export function createOwnerObserver(
	owner: SolidOwner,
	rootId: number,
	onUpdate: (children: MappedOwner[], components: MappedComponent[]) => void,
	options: CreateOwnerTreeOptions = {},
): {
	update: VoidFunction
	forceUpdate: VoidFunction
} {
	const {
		enabled,
		trackSignals = falseFn,
		trackComponents = falseFn,
		trackBatchedUpdates = falseFn,
	} = options

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

	return { update, forceUpdate }
}

export function createGraphRoot(
	root: SolidOwner,
	rootId: number,
	options?: CreateOwnerTreeOptions,
): [
	{
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

	const { update, forceUpdate } = createOwnerObserver(
		root,
		rootId,
		(children, components) => {
			setChildren(children)
			setComponents(components)
		},
		options,
	)
	update()

	return [
		{ children, components },
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
	let owner = getOwner()!
	if (!owner)
		return console.warn(
			"reatachOwner helper should be used synchronously inside createRoot callback body.",
		)

	const ctx = useDebuggerContext()
	if (!ctx) return console.warn("reatachOwner helper should be used under <Debugger> component.")

	ctx.update()

	// find the detached root — user could be calling reattachOwner from inside a futher computation
	while (owner.owner?.owned?.includes(owner)) owner = owner.owner
	const parent = owner.owner

	// attach to parent
	if (parent) {
		const ownedRoots = parent.ownedRoots ?? (parent.ownedRoots = new Set())
		ownedRoots.add(owner)
		onOwnerCleanup(owner, () => {
			ownedRoots.delete(owner)
			ctx.update()
		})
	}
	// attach to UNOWNED
	else {
		// TODO
	}
}
