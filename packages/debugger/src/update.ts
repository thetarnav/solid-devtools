import { createSignal, onCleanup } from "solid-js"
import throttle from "@solid-primitives/throttle"
import { MappedRoot, MappedOwner, SolidOwner } from "@shared/graph"
import { mapOwnerTree } from "./walker"
import { SignalUpdatePayload, UpdateType } from "@shared/messanger"
import { batchUpdate } from "./batchUpdates"

export type SignalUpdateHandler = (payload: SignalUpdatePayload) => void
export type ComputationUpdateHandler = (id: number) => void

let windowAfterUpdatePatched = false
const graphUpdateListeners = new Set<VoidFunction>()

function patchWindowAfterUpdate() {
	if (windowAfterUpdatePatched) return
	const runListeners = () => graphUpdateListeners.forEach(f => f())
	if (typeof window._$afterUpdate === "function") {
		const prev = window._$afterUpdate
		window._$afterUpdate = () => (prev(), runListeners())
	} else window._$afterUpdate = runListeners
}

/**
 * Runs the callback on every Solid Graph Update – whenever computations update because of a signal change.
 * The listener is automatically cleaned-up on root dispose.
 */
export function makeGraphUpdateListener(onUpdate: VoidFunction): VoidFunction {
	patchWindowAfterUpdate()
	graphUpdateListeners.add(onUpdate)
	return onCleanup(() => graphUpdateListeners.delete(onUpdate))
}

export function createOwnerObserver(
	owner: SolidOwner,
	rootId: number,
	onUpdate: (tree: MappedOwner[]) => void,
) {
	const onComputationUpdate: ComputationUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Computation, payload })
	}
	const onSignalUpdate: SignalUpdateHandler = payload => {
		batchUpdate({ type: UpdateType.Signal, payload })
	}
	const update = () => {
		const tree = mapOwnerTree(owner, { onComputationUpdate, onSignalUpdate, rootId })
		onUpdate(tree)
	}
	const [throttledUpdate] = throttle(update, 300)
	makeGraphUpdateListener(throttledUpdate)
}

let LAST_ROOT_ID = 0

export function createGraphRoot(root: SolidOwner): MappedRoot {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	const id = LAST_ROOT_ID++
	createOwnerObserver(root, id, setTree)
	return {
		id,
		get children() {
			return tree()
		},
	}
}
