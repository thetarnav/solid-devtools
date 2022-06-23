import { createEffect, onCleanup, runWithOwner, untrack } from "solid-js"
import { throttle } from "@solid-primitives/scheduled"
import { createBranch } from "@solid-primitives/rootless"
import { getOwner, OwnerType, SolidOwner, SolidRoot } from "@shared/graph"
import { UpdateType } from "@shared/messanger"
import { batchUpdate, ComputationUpdateHandler, SignalUpdateHandler } from "./batchUpdates"
import { walkSolidTree } from "./walker"
import {
	addRootToOwnedRoots,
	getDebuggerContext,
	getNewSdtId,
	markOwnerType,
	onOwnerCleanup,
	removeDebuggerContext,
	setDebuggerContext,
} from "./utils"
import { enabled, debuggerConfig, onForceUpdate, onUpdate, updateRoot, removeRoot } from "./plugin"

export function createGraphRoot(owner: SolidRoot): void {
	// setup the debugger in a separate root, so that it doesn't walk and track itself
	createBranch(() => {
		const rootId = getNewSdtId()

		const onComputationUpdate: ComputationUpdateHandler = payload => {
			if (!debuggerConfig.trackBatchedUpdates || owner.isDisposed) return
			if (enabled()) triggerRootUpdate()
			batchUpdate({ type: UpdateType.Computation, payload })
		}
		const onSignalUpdate: SignalUpdateHandler = payload => {
			if (!debuggerConfig.trackBatchedUpdates || owner.isDisposed) return
			batchUpdate({ type: UpdateType.Signal, payload })
		}

		const forceRootUpdate = () => {
			if (owner.isDisposed) return
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

		// force trigger update when enabled changes to true
		createEffect(() => enabled() && forceRootUpdate())

		setDebuggerContext(owner, { rootId, triggerRootUpdate, forceRootUpdate })

		onCleanup(() => {
			removeDebuggerContext(owner)
			removeRoot(rootId)
			owner.isDisposed = true
		})
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
export function attachDebugger(_owner: SolidOwner | null = getOwner()): void {
	let owner = _owner as SolidOwner
	if (!owner)
		return console.warn(
			"reatachOwner helper should be used synchronously inside createRoot callback body.",
		)

	forEachLookupRoot(owner, root => {
		const ctx = getDebuggerContext(owner)

		markOwnerType(root, OwnerType.Root)

		// under an existing debugger root
		if (ctx) {
			ctx.triggerRootUpdate()

			let parent = findClosestAliveParent(root)!
			if (!parent.owner) return console.warn("PARENT_SHOULD_BE_ALIVE")

			let removeFromOwned = addRootToOwnedRoots(parent.owner, root)

			const onParentCleanup = () => {
				const newParent = findClosestAliveParent(root)
				if (newParent.owner) {
					parent = newParent
					removeFromOwned()
					removeFromOwned = addRootToOwnedRoots(parent.owner, root)
					onOwnerCleanup(parent.root, onParentCleanup)
				} else {
					removeFromOwned()
					removeOwnCleanup()
					runWithOwner(root, () => createGraphRoot(root))
				}
			}

			const removeParentCleanup = onOwnerCleanup(parent.root, onParentCleanup)

			const removeOwnCleanup = onOwnerCleanup(root, () => {
				root.isDisposed = true
				removeFromOwned()
				removeParentCleanup()
				ctx.triggerRootUpdate()
			})
		}
		// seperated from existing debugger roots
		else runWithOwner(root, () => createGraphRoot(root))
	})
}

const isOwnerTypeRoot = (o: SolidOwner): o is SolidRoot => o.sdtType === OwnerType.Root || !o.owner

/**
 * Searches for the closest alive parent of the given owner.
 * A parent here consists of `{ owner: SolidOwner; root: SolidRoot }` where `owner` is the closest tree node to attach to, and `root` in the closest subroot/root that is not disposed.
 * @param owner
 * @returns `{ owner: SolidOwner; root: SolidRoot }`
 */
function findClosestAliveParent(
	owner: SolidOwner,
): { owner: SolidOwner; root: SolidRoot } | { owner: null; root: null } {
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
 * Run callback for each subroot/root from the tree root to the given owner.
 * The callback is run only for roots that haven't been handled before.
 */
function forEachLookupRoot(owner: SolidOwner, callback: (root: SolidRoot) => void): void {
	const roots: SolidRoot[] = []
	do {
		// check if it's a root/subroot
		if (owner.sdtType === OwnerType.Root || !owner.owner || !owner.owner.owned?.includes(owner)) {
			// skip already handled roots
			if (owner.sdtType) break
			roots.push(owner as SolidRoot)
		}
		owner = owner.owner!
	} while (owner)
	// callback roots in downwards direction
	for (let i = roots.length - 1; i >= 0; i--) callback(roots[i])
}
