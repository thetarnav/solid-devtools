import {
  Accessor,
  createComputed,
  createMemo,
  createRoot,
  createSignal,
  runWithOwner,
} from "solid-js"
import { AnyFunction, AnyObject, noop, warn } from "@solid-primitives/utils"
import {
  DebuggerContext,
  NodeType,
  SolidComputation,
  SolidOwner,
  SolidRoot,
  SolidSignal,
  SolidMemo,
  getOwner,
  NodeID,
} from "@solid-devtools/shared/graph"
import { INTERNAL, UNNAMED } from "@solid-devtools/shared/variables"
import { trimString } from "@solid-devtools/shared/utils"
import { Owner, RootFunction } from "@solid-devtools/shared/solid"

export const isSolidComputation = (o: Readonly<SolidOwner>): o is SolidComputation => "fn" in o

export const isSolidMemo = (o: Readonly<SolidOwner>): o is SolidMemo => _isMemo(o)

export const isSolidOwner = (o: Readonly<SolidOwner> | SolidSignal): o is SolidOwner => "owned" in o

export const isSolidRoot = (o: Readonly<SolidOwner>): o is SolidRoot =>
  o.sdtType === NodeType.Root || !isSolidComputation(o)

const _isComponent = (o: Readonly<AnyObject>): boolean => "componentName" in o

const _isMemo = (o: Readonly<AnyObject>): boolean =>
  "value" in o && "comparator" in o && o.pure === true

const fnMatchesRefresh = (fn: AnyFunction): boolean =>
  (fn + "").replace(/[\n\t]/g, "").replace(/ +/g, " ") ===
  "() => { const c = source(); if (c) { return untrack(() => c(props)); } return undefined; }"

export function getOwnerName(owner: Readonly<SolidOwner>): string {
  const { name, componentName: component } = owner
  if (component && typeof component === "string")
    return component.startsWith("_Hot$$") ? component.slice(6) : component
  return name || UNNAMED
}
export function getSignalName(signal: Readonly<SolidSignal>): string {
  return signal.name || UNNAMED
}

export function getNodeName(o: Readonly<SolidSignal | SolidOwner>): string {
  const name = isSolidOwner(o) ? getOwnerName(o) : getSignalName(o)
  return trimString(name, 20)
}

export function getNodeType(o: Readonly<SolidSignal | SolidOwner>): NodeType {
  if (isSolidOwner(o)) return getOwnerType(o)
  return NodeType.Signal
}

export const getOwnerType = (o: Readonly<SolidOwner>): NodeType => {
  if (typeof o.sdtType !== "undefined") return o.sdtType
  if (!isSolidComputation(o)) return NodeType.Root
  // Precompiled components do not start with "_Hot$$"
  // we need a way to identify imported (3rd party) vs user components
  if (_isComponent(o)) return NodeType.Component
  if (isSolidMemo(o)) {
    if (fnMatchesRefresh(o.fn)) return NodeType.Refresh
    return NodeType.Memo
  }
  // Effect
  if (o.pure === false) {
    if (o.user === true) return NodeType.Effect
    return NodeType.Render
  }
  return NodeType.Computation
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

export function lookupOwner(
  owner: SolidOwner,
  predicate: (owner: SolidOwner) => boolean,
): SolidOwner | null {
  do {
    if (predicate(owner)) return owner
    owner = owner.owner!
  } while (owner.owner)
  return null
}

export function setDebuggerContext(owner: SolidRoot, ctx: DebuggerContext): void {
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

const DISPOSE_ID = Symbol("Dispose ID")
export function onDispose<T>(
  fn: () => T,
  { prepend = false, id }: { prepend?: boolean; id?: string | symbol } = {},
): () => T {
  const owner = getOwner()
  if (!owner) {
    warn("onDispose called outside of a reactive owner")
    return fn
  }
  // owner is a root
  if (isSolidRoot(owner)) onOwnerCleanup(owner, fn, prepend)
  // owner is a computation
  else if (owner.owner) {
    if (id !== undefined && owner.owner.cleanups?.some(c => (c as any)[DISPOSE_ID] === id))
      return fn
    onOwnerCleanup(owner.owner, fn, prepend)
    ;(fn as any)[DISPOSE_ID] = id
  }
  return fn
}

export function createUnownedRoot<T>(fn: (dispose: VoidFunction) => T): T {
  return runWithOwner(null as any, () => createRoot(fn))
}

export function getFunctionSources(fn: () => unknown): SolidSignal[] {
  let nodes: SolidSignal[] | undefined
  let init = true
  runWithOwner(null as any, () =>
    createRoot(dispose =>
      createComputed(() => {
        if (!init) return
        init = false
        fn()
        const sources = getOwner()!.sources
        if (sources) nodes = [...sources]
        dispose()
      }),
    ),
  )
  return nodes ?? []
}

let LAST_ID = 0
export const getNewSdtId = (): NodeID => (LAST_ID++).toString(16)

export function markOwnerName(o: SolidOwner): string {
  if (o.sdtName !== undefined) return o.sdtName
  return (o.sdtName = getNodeName(o))
}
export function markOwnerType(o: SolidOwner, type?: NodeType): NodeType {
  if (o.sdtType !== undefined) return o.sdtType
  return (o.sdtType = type ?? getOwnerType(o))
}
export function markNodeID(o: { sdtId?: NodeID }): NodeID {
  if (o.sdtId !== undefined) return o.sdtId
  return (o.sdtId = getNewSdtId())
}
export function markNodesID(nodes?: { sdtId?: NodeID }[] | null): NodeID[] {
  if (!nodes || !nodes.length) return []
  return nodes.map(markNodeID)
}

/**
 * Reactive array reducer — if at least one consumer (boolean signal) is enabled — the returned result will the `true`.
 */
export function createConsumers(): [
  needed: Accessor<boolean>,
  addConsumer: (consumer: Accessor<boolean>) => void,
] {
  const [consumers, setConsumers] = createSignal<Accessor<boolean>[]>([], { name: "consumers" })
  const enabled = createMemo<boolean>(() => consumers().some(consumer => consumer()))
  return [enabled, consumer => setConsumers(p => [...p, consumer])]
}

let SkipInternalRoot: RootFunction<unknown> | null = null

export function createInternalRoot<T>(fn: RootFunction<T>, detachedOwner?: Owner): T {
  SkipInternalRoot = fn
  const v = createRoot(dispose => {
    const owner = getOwner() as SolidRoot
    setDebuggerContext(owner, INTERNAL)
    return fn(dispose)
  }, detachedOwner)
  if (SkipInternalRoot === fn) SkipInternalRoot = null
  return v
}
export const skipInternalRoot = () => {
  const skip = !!SkipInternalRoot
  if (skip) SkipInternalRoot = null
  return skip
}
