import { Accessor, createSignal, onCleanup } from "solid-js"
import throttle from "@solid-primitives/throttle"
import { GraphRoot, MappedOwner, Owner } from "@shared/graph"
import { mapOwnerTree } from "./walker"

let windowAfterUpdatePatched = false
const solidUpdateListeners = new Set<VoidFunction>()

function patchWindowAfterUpdate() {
	if (windowAfterUpdatePatched) return
	const runListeners = () => solidUpdateListeners.forEach(f => f())
	if (typeof window._$afterUpdate === "function") {
		const prev = window._$afterUpdate
		window._$afterUpdate = () => (prev(), runListeners())
	} else window._$afterUpdate = runListeners
}

/**
 * Runs the callback on every Solid Update – whenever computations update because of a signal change.
 * The listener is automatically cleaned-up on root dispose.
 */
export function makeSolidUpdateListener(onUpdate: VoidFunction): void {
	patchWindowAfterUpdate()
	solidUpdateListeners.add(onUpdate)
	onCleanup(() => solidUpdateListeners.delete(onUpdate))
}

export function createOwnerObserver(owner: Owner, onUpdate: (tree: MappedOwner[]) => void) {
	const update = () => {
		const tree = mapOwnerTree(owner)
		onUpdate(tree)
	}
	const [throttledUpdate] = throttle(update, 300)
	makeSolidUpdateListener(throttledUpdate)
}

let ROOT_ID = 0

export function createGraphRoot(root: Owner): GraphRoot {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	createOwnerObserver(root, setTree)
	return {
		id: ROOT_ID++,
		get children() {
			return tree()
		},
	}
}
