import { onCleanup } from "solid-js"
import { SolidComputation, SolidSignal, ValueUpdateListener } from "@shared/graph"
import { callArrayProp, mutateRemove, pushToArrayProp } from "@shared/utils"
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
 *
 * This will listen to all updates of the reactive graph — including ones outside of the <Debugger> component, and debugger internal computations.
 */
export function makeSolidUpdateListener(onUpdate: VoidFunction): VoidFunction {
	patchWindowAfterUpdate()
	graphUpdateListeners.add(onUpdate)
	return onCleanup(() => graphUpdateListeners.delete(onUpdate))
}

const RootUpdateListeners: Record<number, VoidFunction[]> = {}

/**
 * Runs the callback on every Solid Graph Update — scoped to a Root of given {@link rootId}.
 * The listener is automatically cleaned-up on root dispose.
 *
 * @param rootId id of root of tracked owner tree
 * @param onUpdate callback
 * @returns clean function
 */
export function makeRootUpdateListener(rootId: number, onUpdate: VoidFunction): VoidFunction {
	const listeners = pushToArrayProp(RootUpdateListeners, rootId, onUpdate)
	return () => {
		mutateRemove(listeners, onUpdate)
		if (listeners.length === 0) delete RootUpdateListeners[rootId]
	}
}

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
export function observeComputationUpdate(
	owner: SolidComputation,
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
		callArrayProp(RootUpdateListeners, rootId)
		return fn(...a)
	}
}

/**
 * Patches the owner/signal value, firing the callback on each update immediately as it happened.
 */
export function observeValueUpdate(
	node: SolidSignal,
	rootId: number,
	onUpdate: ValueUpdateListener,
): void {
	// node already patched
	if (node.onValueUpdate) {
		node.onValueUpdate[rootId] = onUpdate
		return
	}
	// patch node
	node.onValueUpdate = { [rootId]: onUpdate }
	let value = node.value
	let safeValue = getSafeValue(value)
	Object.defineProperty(node, "value", {
		get: () => value,
		set: newValue => {
			const newSafe = getSafeValue(newValue)
			for (const listener of Object.values(node.onValueUpdate!)) listener(newSafe, safeValue)
			;(value = newValue), (safeValue = newSafe)
		},
	})
}
