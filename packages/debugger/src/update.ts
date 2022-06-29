import { onCleanup } from "solid-js"
import { getOwner, SignalState, SolidComputation, ValueUpdateListener } from "@shared/graph"
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
	const unsub = () => graphUpdateListeners.delete(onUpdate)
	getOwner() && onCleanup(unsub)
	return unsub
}

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
export function observeComputationUpdate(owner: SolidComputation, onRun: VoidFunction): void {
	// owner already patched
	if (owner.onComputationUpdate) return void (owner.onComputationUpdate = onRun)
	// patch owner
	owner.onComputationUpdate = onRun
	interceptComputationRerun(owner, (fn, prev) => {
		owner.onComputationUpdate!()
		fn(prev)
	})
}

export function interceptComputationRerun(
	owner: SolidComputation,
	onRun: <T>(execute: (prev: T) => T, prev: T) => void,
): void {
	const _fn = owner.fn
	let v!: unknown
	const fn = (a: unknown) => (v = _fn(a))
	owner.fn = !!owner.fn.length
		? prev => {
				onRun(fn, prev)
				return v
		  }
		: () => {
				onRun(fn, undefined)
				return v
		  }
}

/**
 * Patches the owner/signal value, firing the callback on each update immediately as it happened.
 */
export function observeValueUpdate(
	node: SignalState,
	onUpdate: ValueUpdateListener,
	symbol: symbol,
): VoidFunction {
	const remove = () => delete node.onValueUpdate![symbol]
	// node already patched
	if (node.onValueUpdate) {
		node.onValueUpdate[symbol] = onUpdate
		return remove
	}
	// patch node
	const map = (node.onValueUpdate = { [symbol]: onUpdate })
	let value = node.value
	Object.defineProperty(node, "value", {
		get: () => value,
		set: newValue => {
			for (let sym of Object.getOwnPropertySymbols(map)) map[sym](newValue, value)
			value = newValue
		},
	})
	return remove
}
