import { createEffect, onCleanup, runWithOwner, untrack } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner, OwnerType, SolidOwner, SolidRoot } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { makeRootUpdateListener } from "./update"
import { walkSolidTree } from "./walker"
import {
	getDebuggerContext,
	getNewSdtId,
	markOwnerType,
	onOwnerCleanup,
	removeDebuggerContext,
	setDebuggerContext,
} from "./utils"
import { enabled, debuggerConfig, onForceUpdate, onUpdate, updateRoot, removeRoot } from "./plugin"

export function createGraphRoot(owner: SolidOwner): void {
	// setup the debugger in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const rootId = getNewSdtId()

		const onComputationUpdate: ComputationUpdateHandler = payload => {
			// TODO: move the makeRootUpdateListener logic here, no need for separate map
			// TODO: run batch update only when the debugger is enabled and the graph root isn't disposed
			batchUpdate({ type: UpdateType.Computation, payload })
		}
		const onSignalUpdate: SignalUpdateHandler = payload => {
			// TODO: run batch update only when the debugger is enabled and the graph root isn't disposed
			batchUpdate({ type: UpdateType.Signal, payload })
		}

		const forceRootUpdate = () => {
			const { tree, components } = untrack(
				walkSolidTree.bind(void 0, owner, {
					...debuggerConfig,
					onComputationUpdate,
					onSignalUpdate,
					rootId,
				}),
			)
			updateRoot({ id: rootId, tree, components })
		}
		const triggerRootUpdate = throttle(forceRootUpdate, 350)

		onUpdate(triggerRootUpdate)
		onForceUpdate(forceRootUpdate)

		createEffect(() => {
			if (!enabled()) return
			forceRootUpdate()
			makeRootUpdateListener(rootId, triggerRootUpdate)
		})

		setDebuggerContext(owner, { rootId, triggerRootUpdate, forceRootUpdate })
		onCleanup(removeDebuggerContext.bind(null, owner))

		onCleanup(removeRoot.bind(null, rootId))
	})
}

const isOwnerTypeRoot = (o: SolidOwner): o is SolidRoot => o.sdtType === OwnerType.Root || !o.owner

const addRootToOwnedRoots = (parent: SolidOwner, root: SolidRoot): VoidFunction => {
	const ownedRoots = parent.ownedRoots ?? (parent.ownedRoots = new Set())
	ownedRoots.add(root)
	return (): void => void ownedRoots.delete(root)
}

const findClosestAliveParent = (
	owner: SolidOwner,
): { owner: SolidOwner; root: SolidRoot } | { owner: null; root: null } => {
	let disposed: SolidRoot | null = null
	let closestAliveRoot: SolidRoot | null = null
	let current = owner
	while (current.owner && !closestAliveRoot) {
		current = current.owner
		if (isOwnerTypeRoot(current)) {
			if (current.isDisposed) disposed = current
			else closestAliveRoot = current
		}
	}
	if (!closestAliveRoot) return { owner: null, root: null }
	return { owner: disposed?.owner ?? owner.owner!, root: closestAliveRoot }
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
export function reattachOwner(_owner: SolidOwner | null = getOwner()): void {
	let owner = _owner as SolidOwner
	if (!owner)
		return console.warn(
			"reatachOwner helper should be used synchronously inside createRoot callback body.",
		)

	const roots: SolidRoot[] = []
	let o = owner
	while (o.owner) {
		if (isOwnerTypeRoot(o)) roots.push(o)
		o = o.owner
	}
	roots.push(o as SolidRoot)

	for (let i = roots.length - 1; i >= 0; i--) {
		const root = roots[i]
		if (root.sdtType) continue

		const ctx = getDebuggerContext(owner)

		markOwnerType(root, OwnerType.Root)

		// under an existing debugger root
		if (ctx) {
			ctx.triggerRootUpdate()

			let parent = findClosestAliveParent(root)!
			if (!parent.owner) return console.warn("parent should be available")

			let remove = addRootToOwnedRoots(parent.owner, root)

			onOwnerCleanup(root, () => {
				root.isDisposed = true
				remove()
				ctx.triggerRootUpdate()
			})

			const onParentCleanup = () => {
				const newParent = findClosestAliveParent(root)
				if (newParent.owner) {
					console.log(root.name, parent, newParent)

					parent = newParent
					remove()
					remove = addRootToOwnedRoots(parent.owner, root)
					onOwnerCleanup(parent.root, onParentCleanup)
				} else {
					console.log("parent is dead")

					// TODO: create separate tree
				}
			}

			onOwnerCleanup(parent.root, onParentCleanup)
		}
		// seperated from existing debugger roots
		else {
			// find the root
			onOwnerCleanup(root, () => {
				console.log("ROOT DISPOSED")

				root.isDisposed = true
			})
			runWithOwner(root, () => createGraphRoot(root))
		}
	}
}
