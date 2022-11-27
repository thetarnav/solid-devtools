import { untrack } from 'solid-js'
import { skipInternalRoot, tryOnCleanup } from './utils'
import { Core, Solid, ValueUpdateListener } from './types'

//
// AFTER UPDATE
//

const GraphUpdateListeners = new Set<VoidFunction>()

// Patch window._$afterUpdate
{
  const runListeners = () => GraphUpdateListeners.forEach(f => f())
  if (typeof window._$afterUpdate === 'function') {
    GraphUpdateListeners.add(window._$afterUpdate)
  }
  window._$afterUpdate = runListeners
}

/**
 * Runs the callback on every Solid Graph Update – whenever computations update because of a signal change.
 * The listener is automatically cleaned-up on root dispose.
 *
 * This will listen to all updates of the reactive graph — including ones outside of the <Debugger> component, and debugger internal computations.
 */
export function makeSolidUpdateListener(onUpdate: VoidFunction): VoidFunction {
  GraphUpdateListeners.add(onUpdate)
  return tryOnCleanup(() => {
    GraphUpdateListeners.delete(onUpdate)
  })
}

//
// OBSERVE NODES
//

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
export function observeComputationUpdate(owner: Solid.Computation, onRun: VoidFunction): void {
  // owner already patched
  if (owner.onComputationUpdate) return void (owner.onComputationUpdate = onRun)
  // patch owner
  owner.onComputationUpdate = onRun
  interceptComputationRerun(owner, fn => {
    untrack(owner.onComputationUpdate!)
    fn()
  })
}

/**
 * Patches the "fn" prop of SolidComputation. Will execute the {@link onRun} callback whenever the computation is executed.
 * @param owner computation to patch
 * @param onRun execution handler
 *
 * {@link onRun} is provided with `execute()` function, and a `prev` value. `execute` is the computation handler function, it needs to be called inside {@link onRun} to calculate the next value or run side-effects.
 *
 * @example
 * ```ts
 * interceptComputationRerun(owner, (fn, prev) => {
 * 	// do something before execution
 * 	fn()
 * 	// do something after execution
 * })
 * ```
 */
export function interceptComputationRerun(
  owner: Solid.Computation,
  onRun: <T>(execute: () => T, prev: T) => void,
): void {
  const _fn = owner.fn
  let v!: unknown
  let prev!: unknown
  const fn = () => (v = _fn(prev))
  owner.fn = !!owner.fn.length
    ? p => {
        onRun(fn, (prev = p))
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
  node: Solid.SignalState,
  onUpdate: ValueUpdateListener,
  symbol: symbol,
): void {
  // node already patched
  if (node.onValueUpdate) {
    node.onValueUpdate[symbol] = onUpdate
    return
  }
  // patch node
  const map = (node.onValueUpdate = { [symbol]: onUpdate })
  let value = node.value
  Object.defineProperty(node, 'value', {
    get: () => value,
    set: newValue => {
      for (let sym of Object.getOwnPropertySymbols(map)) map[sym](newValue, value)
      value = newValue
    },
  })
}

export function removeValueUpdateObserver(node: Solid.SignalState, symbol: symbol): void {
  if (node.onValueUpdate) delete node.onValueUpdate[symbol]
}

export function makeValueUpdateListener(
  node: Solid.SignalState,
  onUpdate: ValueUpdateListener,
  symbol: symbol,
): void {
  observeValueUpdate(node, onUpdate, symbol)
  tryOnCleanup(() => removeValueUpdateObserver(node, symbol))
}
