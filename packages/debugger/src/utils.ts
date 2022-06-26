import { AnyFunction, AnyObject, noop } from "@solid-primitives/utils"
import {
	DebuggerContext,
	OwnerType,
	SolidComputation,
	SolidOwner,
	SolidRoot,
	SolidSignal,
	getOwner,
} from "@shared/graph"
import { SafeValue } from "@shared/messanger"
import { Accessor, createMemo, createSignal } from "solid-js"

export const isComputation = (o: SolidOwner | SolidSignal): o is SolidComputation =>
	"fn" in o && typeof o.fn === "function" && "sources" in o

export const isComponent = (o: Readonly<AnyObject>): boolean => "componentName" in o

export const isMemo = (o: Readonly<AnyObject>): boolean =>
	"value" in o && "comparator" in o && o.pure === true

export const fnMatchesRefresh = (fn: AnyFunction): boolean =>
	(fn + "").replace(/[\n\t]/g, "").replace(/ +/g, " ") ===
	"() => { const c = source(); if (c) { return untrack(() => c(props)); } return undefined; }"

export const getOwnerName = (owner: Readonly<SolidOwner>): string => {
	const { name, componentName: component } = owner
	if (component && typeof component === "string")
		return component.startsWith("_Hot$$") ? component.slice(6) : component
	return name || "(anonymous)"
}

export const getOwnerType = (o: Readonly<AnyObject>): OwnerType => {
	if ("sdtType" in o) return o.sdtType
	// Precompiled components do not start with "_Hot$$"
	// we need a way to identify imported (3rd party) vs user components
	if (isComponent(o)) return OwnerType.Component
	if (isMemo(o)) {
		if (fnMatchesRefresh(o.fn)) return OwnerType.Refresh
		return OwnerType.Memo
	}
	// Effect
	if (o.pure === false) {
		if (o.user === true) return OwnerType.Effect
		return OwnerType.Render
	}
	return OwnerType.Computation
}

const literalTypes = ["bigint", "number", "boolean", "string", "undefined"]

export function getSafeValue(value: unknown): SafeValue {
	if (literalTypes.includes(typeof value)) return value as SafeValue
	return value + ""
}

/**
 * helper to getting to an owner that you want — walking downwards
 */
export function findOwner(
	root: SolidOwner,
	predicate: (owner: SolidOwner) => boolean,
): SolidOwner | null {
	const queue: SolidOwner[] = [root]
	for (const owner of queue) {
		if (predicate(owner)) return owner
		if (Array.isArray(owner.owned)) queue.push(...owner.owned)
	}
	return null
}

export function setDebuggerContext(owner: SolidOwner, ctx: DebuggerContext): void {
	owner.sdtContext = ctx
}
export function getDebuggerContext(owner: SolidOwner): DebuggerContext | undefined {
	while (!owner.sdtContext && owner.owner) owner = owner.owner
	return owner.sdtContext
}
export function removeDebuggerContext(owner: SolidOwner): void {
	delete owner.sdtContext
}

/**
 * Attach onCleanup callback to a reactive owner
 * @param prepend add the callback to the front of the stack, instead of pushing, fot it to be called before other cleanup callbacks.
 * @returns a function to remove the cleanup callback
 */
export function onOwnerCleanup(owner: SolidOwner, fn: VoidFunction, prepend = false): VoidFunction {
	if (owner.cleanups === null) owner.cleanups = [fn]
	else if (prepend) owner.cleanups.splice(0, 0, fn)
	else owner.cleanups.push(fn)
	return () => owner.cleanups?.splice(owner.cleanups.indexOf(fn), 1)
}

/**
 * Attach onCleanup callback to the parent of a reactive owner if it has one.
 * @param prepend add the callback to the front of the stack, instead of pushing, fot it to be called before other cleanup callbacks.
 * @returns a function to remove the cleanup callback
 */
export function onParentCleanup(
	owner: SolidOwner,
	fn: VoidFunction,
	prepend = false,
): VoidFunction {
	if (owner.owner) return onOwnerCleanup(owner.owner, fn, prepend)
	return noop
}

export function onDispose<T>(fn: () => T, prepend = false): () => T {
	const owner = getOwner()
	if (!owner) {
		console.warn("onDispose called outside of a reactive owner")
		return fn
	}
	onParentCleanup(owner, fn, prepend)
	return fn
}

let LAST_ID = 0
export const getNewSdtId = () => LAST_ID++

export function markOwnerType(o: SolidOwner, type?: OwnerType): OwnerType {
	if (o.sdtType !== undefined) return o.sdtType
	else return (o.sdtType = type ?? getOwnerType(o))
}
export function markNodeID(o: { sdtId?: number }): number {
	if (o.sdtId !== undefined) return o.sdtId
	else return (o.sdtId = getNewSdtId())
}
export function markNodesID(nodes?: { sdtId?: number }[] | null): number[] {
	if (!nodes || !nodes.length) return []
	return nodes.map(markNodeID)
}

/**
 * Adds SubRoot object to `ownedRoots` property of owner
 * @returns a function to remove from the `ownedRoots` property
 */
export function addRootToOwnedRoots(parent: SolidOwner, root: SolidRoot): VoidFunction {
	const ownedRoots = parent.ownedRoots ?? (parent.ownedRoots = new Set())
	ownedRoots.add(root)
	return (): void => void ownedRoots.delete(root)
}

/**
 * Reactive array reducer — if at least one consumer (boolean signal) is enabled — the returned result will the `true`.
 */
export function createConsumers(): [
	needed: Accessor<boolean>,
	addConsumer: (consumer: Accessor<boolean>) => void,
] {
	const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([])
	const enabled = createMemo<boolean>(() => consumers().some(consumer => consumer()))
	return [enabled, consumer => setConsumers(p => [...p, consumer])]
}
