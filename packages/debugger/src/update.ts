import { noop, onRootCleanup } from "@solid-primitives/utils"
import { Observable, Observer as ObjectObserver } from "object-observer"
import { SignalState, SolidComputation, SolidRoot, ValueUpdateListener } from "@shared/graph"
import { Owner } from "@shared/solid"
import { WINDOW_WRAP_STORE_PROPERTY } from "@shared/variables"
import { skipInternalRoot } from "./utils"

//
// AFTER UPDATE
//

const GraphUpdateListeners = new Set<VoidFunction>()

// Patch window._$afterUpdate
{
  const runListeners = () => GraphUpdateListeners.forEach(f => f())
  if (typeof window._$afterUpdate === "function") {
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
  return onRootCleanup(() => {
    GraphUpdateListeners.delete(onUpdate)
  })
}

//
// AFTER CREATE ROOT
//

export type AfterCrateRoot = (root: SolidRoot) => void

const CreateRootListeners = new Set<AfterCrateRoot>()

// Patch window._$afterCreateRoot
{
  const runListeners: AfterCrateRoot = root => {
    if (skipInternalRoot()) return
    CreateRootListeners.forEach(f => f(root))
  }
  if (typeof window._$afterCreateRoot === "function") {
    CreateRootListeners.add(window._$afterCreateRoot)
  }
  window._$afterCreateRoot = runListeners as (root: Owner) => void
}

/**
 * Runs the callback every time a new Solid Root is created.
 * The listener is automatically cleaned-up on root dispose.
 */
export function makeCreateRootListener(onUpdate: AfterCrateRoot): VoidFunction {
  CreateRootListeners.add(onUpdate)
  return onRootCleanup(() => CreateRootListeners.delete(onUpdate))
}

//
// WRAP STORES
//

export type { ObjectObserver }

// window[WINDOW_WRAP_STORE_PROPERTY] is internal — no need to worry about other users
window[WINDOW_WRAP_STORE_PROPERTY] = init => {
  return Observable.from(init)
}

export function makeStoreObserver(state: object, onUpdate: ObjectObserver): VoidFunction {
  if (!Observable.isObservable(state)) {
    console.warn(`Object ${state} is not wrapped`)
    return noop
  }
  Observable.observe(state, onUpdate)
  return onRootCleanup(() => Observable.unobserve(state, onUpdate))
}

//
// OBSERVE NODES
//

/**
 * Wraps the fn prop of owner object to trigger handler whenever the computation is executed.
 */
export function observeComputationUpdate(owner: SolidComputation, onRun: VoidFunction): void {
  // owner already patched
  if (owner.onComputationUpdate) return void (owner.onComputationUpdate = onRun)
  // patch owner
  owner.onComputationUpdate = onRun
  interceptComputationRerun(owner, fn => {
    owner.onComputationUpdate!()
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
  owner: SolidComputation,
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
