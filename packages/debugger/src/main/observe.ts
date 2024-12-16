/*

Dev hooks and observing reactive graph nodes

*/

import {chain, tryOnCleanup} from '@solid-primitives/utils'
import {attachDebugger} from './roots.ts'
import {type Solid, type ValueUpdateListener} from './types.ts'
import {isSolidRoot} from './utils.ts'


const GraphUpdateListeners = new Set<VoidFunction>()

export function startObserve() {

    for (const owner of SolidDevtools$$!.get_created_owners()) {
        attachDebugger(owner)
    }

    Solid$$!.hooks.afterCreateOwner = function (owner) {
        if (isSolidRoot(owner)) {
            attachDebugger(owner)
        }
    }

    Solid$$!.hooks.afterUpdate = chain(GraphUpdateListeners)
}

/**
 * Runs the callback on every Solid Graph Update – whenever computations update because of a signal change.
 * The listener is automatically cleaned-up on root dispose.
 *
 * This will listen to all updates of the reactive graph — including ones outside of the <Debugger> component, and debugger internal computations.
 */
export function addSolidUpdateListener(onUpdate: VoidFunction): VoidFunction {
    GraphUpdateListeners.add(onUpdate)
    return () => GraphUpdateListeners.delete(onUpdate)
}

//
// OBSERVE NODES
//

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

const ComputationUpdateListeners = new WeakMap<Solid.Computation, Record<symbol, VoidFunction>>()

export function observeComputationUpdate(
    owner: Solid.Computation,
    onRun: VoidFunction,
    symbol = Symbol(),
): void {
    let map = ComputationUpdateListeners.get(owner)
    if (!map) ComputationUpdateListeners.set(owner, (map = {}))
    map[symbol] = onRun
    interceptComputationRerun(owner, fn => {
        fn()
        for (const sym of Object.getOwnPropertySymbols(map)) map[sym]!()
    })
}

export function removeComputationUpdateObserver(owner: Solid.Computation, symbol: symbol): void {
    const map = ComputationUpdateListeners.get(owner)
    if (map) delete map[symbol]
}

const SignalUpdateListeners = new WeakMap<
    Solid.SourceMapValue | Solid.Computation,
    Map<symbol, ValueUpdateListener>
>()

/**
 * Patches the owner/signal value, firing the callback on each update immediately as it happened.
 */
export function observeValueUpdate(
    node: Solid.SourceMapValue | Solid.Computation,
    onUpdate: ValueUpdateListener,
    symbol: symbol,
): void {
    let map = SignalUpdateListeners.get(node)
    if (!map) {
        SignalUpdateListeners.set(node, (map = new Map()))
        let value = node.value
        Object.defineProperty(node, 'value', {
            get: () => value,
            set: newValue => {
                for (const fn of map!.values()) fn(newValue, value)
                value = newValue
            },
        })
    }
    map.set(symbol, onUpdate)
}

export function removeValueUpdateObserver(
    node: Solid.SourceMapValue | Solid.Computation,
    symbol: symbol,
): void {
    SignalUpdateListeners.get(node)?.delete(symbol)
}

export function makeValueUpdateListener(
    node: Solid.SourceMapValue | Solid.Computation,
    onUpdate: ValueUpdateListener,
    symbol: symbol,
): void {
    observeValueUpdate(node, onUpdate, symbol)
    tryOnCleanup(() => removeValueUpdateObserver(node, symbol))
}
