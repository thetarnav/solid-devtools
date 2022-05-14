import { Accessor, createSignal, onCleanup } from "solid-js"
import throttle from "@solid-primitives/throttle"
import { GraphRoot, MappedOwner, Owner } from "@shared/graph"
import { mapOwnerTree } from "./walker"

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

export type ComputationRunListener = (id: number) => void

const computationRunListeners = new Set<ComputationRunListener>()

/** @internal */
export function computationRun(id: number) {
	computationRunListeners.forEach(f => f(id))
}

/**
 * Runs the callback on every computation run (whenever a memo/effect/computed etc. reruns).
 * The listener is automatically cleaned-up on root dispose.
 */
export function makeComputationRunListener(listener: ComputationRunListener): VoidFunction {
	computationRunListeners.add(listener)
	return onCleanup(() => computationRunListeners.delete(listener))
}

export function createOwnerObserver(owner: Owner, onUpdate: (tree: MappedOwner[]) => void) {
	const update = () => {
		const tree = mapOwnerTree(owner)
		onUpdate(tree)
	}
	const [throttledUpdate] = throttle(update, 300)
	makeGraphUpdateListener(throttledUpdate)
}

let LAST_ROOT_ID = 0

export function createGraphRoot(root: Owner): GraphRoot {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	createOwnerObserver(root, setTree)
	return {
		id: LAST_ROOT_ID++,
		get children() {
			return tree()
		},
	}
}
