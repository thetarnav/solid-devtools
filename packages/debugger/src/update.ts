import { SolidOwner, ValueUpdateListener } from "@shared/graph"
import { onCleanup } from "solid-js"
import { getSafeValue } from "./utils"

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

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
export function observeComputationUpdate(
	owner: SolidOwner,
	rootId: number,
	onRun: VoidFunction,
): void {
	// owner already patched
	if (owner.onComputationUpdate) {
		owner.onComputationUpdate[rootId] = onRun
		return
	}
	// patch owner
	owner.onComputationUpdate = { [rootId]: onRun }
	const fn = owner.fn.bind(owner)
	owner.fn = (...a) => {
		for (const listener of Object.values(owner.onComputationUpdate!)) listener()
		return fn(...a)
	}
}

/**
 * Patches the owner/signal value, firing the callback on each update immediately as it happened.
 */
export function observeValueUpdate(
	node: { value: unknown; onSignalUpdate?: Record<number, ValueUpdateListener> },
	rootId: number,
	onUpdate: ValueUpdateListener,
): void {
	// node already patched
	if (node.onSignalUpdate) {
		node.onSignalUpdate[rootId] = onUpdate
		return
	}
	// patch node
	node.onSignalUpdate = { [rootId]: onUpdate }
	let value = node.value
	let safeValue = getSafeValue(value)
	Object.defineProperty(node, "value", {
		get: () => value,
		set: newValue => {
			const newSafe = getSafeValue(newValue)
			for (const listener of Object.values(node.onSignalUpdate!)) listener(newSafe, safeValue)
			;(value = newValue), (safeValue = newSafe)
		},
	})
}
