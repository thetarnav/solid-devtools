import {
	Accessor,
	createComputed,
	createEffect,
	createSignal,
	onCleanup,
	runWithOwner,
	untrack,
} from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { createBranch } from "@solid-primitives/rootless"
import { push, splice } from "@solid-primitives/immutable"
import {
	getOwner,
	GraphRoot,
	MappedComponent,
	MappedOwner,
	MappedRoot,
	SolidOwner,
} from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeRootUpdateListener } from "./update"
import { walkSolidTree } from "./walker"
import {
	getDebuggerContext,
	getNewSdtId,
	onOwnerCleanup,
	removeDebuggerContext,
	setDebuggerContext,
} from "./utils"
import {
	enabled,
	setRoots,
	trackBatchedUpdates,
	trackComponents,
	trackSignals,
	onForceUpdate,
	onUpdate,
} from "./plugin"

export function createOwnerObserver(
	owner: SolidOwner,
	rootId: number,
	updateHandler: (tree: MappedOwner, components: MappedComponent[]) => void,
): {
	triggerRootUpdate: VoidFunction
	forceRootUpdate: VoidFunction
} {
	const onComputationUpdate: ComputationUpdateHandler = payload => {
		// TODO: move the makeRootUpdateListener logic here, no need for separate map
		batchUpdate({ type: UpdateType.Computation, payload })
	}
	const onSignalUpdate: SignalUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Signal, payload })
	}
	const forceRootUpdate = () => {
		const { tree, components } = untrack(
			walkSolidTree.bind(void 0, owner, {
				onComputationUpdate,
				onSignalUpdate,
				rootId,
				trackSignals: trackSignals(),
				trackComponents: trackComponents(),
				trackBatchedUpdates: trackBatchedUpdates(),
			}),
		)
		updateHandler(tree, components)
	}
	const triggerRootUpdate = throttle(forceRootUpdate, 350)

	onUpdate(triggerRootUpdate)
	onForceUpdate(forceRootUpdate)

	createEffect(() => {
		if (!enabled()) return
		forceRootUpdate()
		makeRootUpdateListener(rootId, triggerRootUpdate)
	})

	return { triggerRootUpdate, forceRootUpdate }
}

export function createGraphRoot(owner: SolidOwner): void {
	// setup the debugger in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const rootId = getNewSdtId()

		const [getTree, setTree] = createSignal<MappedOwner>()
		const [components, setComponents] = createSignal<MappedComponent[]>([])

		const { triggerRootUpdate, forceRootUpdate } = createOwnerObserver(
			owner,
			rootId,
			(tree, components) => {
				setTree(tree)
				setComponents(components)
			},
		)

		setDebuggerContext(owner, { rootId, triggerRootUpdate, forceRootUpdate })
		onCleanup(removeDebuggerContext.bind(null, owner))

		// update global roots signal
		createComputed(() => {
			const tree = getTree()
			if (!tree) return

			const root = { id: rootId, tree }

			setRoots(arr => {
				const index = arr.findIndex(o => o.id === rootId)
				return index !== -1 ? splice(arr, index, 1, root) : push(arr, root)
			})
		})

		// TODO: disposal
	})
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

	const ctx = getDebuggerContext(owner)

	// under an existing debugger root
	if (ctx) {
		ctx.triggerRootUpdate()

		// find the detached root — user could be calling reattachOwner from inside a futher computation
		while (owner.owner?.owned?.includes(owner)) owner = owner.owner
		const parent = owner.owner

		// TODO: remove that check or correct the lookup
		if (!parent) return console.warn("parent should be available")

		const ownedRoots = parent.ownedRoots ?? (parent.ownedRoots = new Set())
		ownedRoots.add(owner)
		let remove = (): void => void ownedRoots.delete(owner)
		let disposed = false
		onOwnerCleanup(owner, () => {
			disposed = true
			remove()
			ctx.triggerRootUpdate()
		})
	}
	// seperated from existing debugger roots
	else {
		// find the root
		while (owner.owner) owner = owner.owner
		runWithOwner(owner, () => {
			createGraphRoot(owner)
		})
	}

	// attach to parent
	if (parent) {
		// onOwnerCleanup(parent, () => {
		// 	if (!disposed) remove = addToUnowned(owner)
		// })
	}
	// attach to UNOWNED
	else {
		// const remove = addToUnowned(owner)
		// onOwnerCleanup(owner, () => {
		// 	remove()
		// 	ctx.update()
		// })
	}
}
