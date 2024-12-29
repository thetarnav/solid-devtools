import {trimString} from '@solid-devtools/shared/utils'
import {type Emit} from '@solid-primitives/event-bus'
import {throttle} from '@solid-primitives/scheduled'
import {NodeType} from './constants.ts'
import {type Solid} from './types.ts'
import setup from './setup.ts'

export const isObject = (o: unknown): o is object => typeof o === 'object' && !!o

export const isSolidOwner = (
    o: Readonly<Solid.Owner | Solid.Store | Solid.Signal>,
): o is Solid.Owner => 'owned' in o

export const isSolidComputation = (o: Readonly<Solid.Owner>): o is Solid.Computation =>
    !!(o as any).fn

export const isSolidRoot = (o: Readonly<Solid.Owner>): o is Solid.Root => !('fn' in o)

export const isSolidMemo = (o: Readonly<Solid.Owner>): o is Solid.Memo =>
    'fn' in o && 'comparator' in o

export const isSolidComponent = (o: Readonly<Solid.Owner>): o is Solid.Component => 'component' in o

export const isStoreNode = (o: object): o is Solid.StoreNode => setup.store.$NODE in o

export const isSolidStore = (
    o: Solid.Owner | Solid.SourceMapValue | Solid.Store,
): o is Solid.Store => !('observers' in o) && 'value' in o && isObject(o.value) && setup.solid.$PROXY in o.value

export const isSolidSignal = (o: Solid.SourceMapValue): o is Solid.Signal =>
    'value' in o && 'observers' in o && 'observerSlots' in o && 'comparator' in o

export function getNodeType(o: Readonly<Solid.Signal | Solid.Owner | Solid.Store>): NodeType {
    if (isSolidOwner(o)) return getOwnerType(o)
    return isSolidStore(o) ? NodeType.Store : NodeType.Signal
}

const SOLID_REFRESH_PREFIX = '[solid-refresh]'

export const getOwnerType = (o: Readonly<Solid.Owner>): NodeType => {
    if (typeof o.sdtType !== 'undefined') return o.sdtType
    if (!isSolidComputation(o)) {
        if ('sources' in o) return NodeType.CatchError
        return NodeType.Root
    }
    if (isSolidComponent(o)) return NodeType.Component
    // memo
    if ('comparator' in o) {
        if (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            (o.owner as {component?: Function} | null)?.component?.name.startsWith(
                SOLID_REFRESH_PREFIX,
            )
        ) {
            return NodeType.Refresh
        }
        return NodeType.Memo
    }
    // Effect
    if (!o.pure) {
        if (o.user === true) return NodeType.Effect
        /*
        after solid 1.8 context is being copied to children owners
        so need to check if the reference is the same
        */
        if (o.context !== null && (!o.owner || o.owner.context !== o.context))
            return NodeType.Context
        return NodeType.Render
    }
    return NodeType.Computation
}

export const getNodeName = (o: {
    component?: ((..._: any) => any) & {displayName?: string},
    name?:      string
}): string | undefined => {

    let name: string | undefined

    search: {
        if (typeof o.component === 'function') {
            if (typeof o.component.displayName === 'string' && o.component.displayName.length > 0) {
                name = o.component.displayName
                break search
            }
            if (typeof o.component.name === 'string' && o.component.name.length > 0) {
                name = o.component.name
                break search
            }
        }
    
        if (o.name != null && o.name.length > 0) {
            name = o.name   
            break search
        }

        return undefined
    }
    
    if (name.startsWith(SOLID_REFRESH_PREFIX)) {
        name = name.slice(SOLID_REFRESH_PREFIX.length)
    }
    
    name = trimString(name, 36)

    return name
}

export function markOwnerType(o: Solid.Owner): NodeType {
    if (o.sdtType !== undefined) return o.sdtType
    return (o.sdtType = getOwnerType(o))
}

/**
 * Checks if the passed owner is disposed.
 */
export function isDisposed(o: Readonly<Solid.Owner>): boolean {
    return !!(isSolidComputation(o)
        ? o.owner && (!o.owner.owned || !o.owner.owned.includes(o))
        : (o as Solid.Root).isDisposed)
}

export function onCleanup(fn: () => void) {
    let owner = setup.solid.getOwner()
    if (owner) {
        if (owner.cleanups === null) owner.cleanups = [fn]
        else owner.cleanups.push(fn)
    }
}

export function getComponentRefreshNode(owner: Readonly<Solid.Component>): Solid.Memo | null {
    const {owned} = owner
    let refresh: Solid.Owner
    if (owned && owned.length === 1 && markOwnerType((refresh = owned[0]!)) === NodeType.Refresh) {
        return refresh as Solid.Memo
    }
    return null
}

export function resolveElements(value: unknown): HTMLElement[] | null {
    const resolved = getResolvedElements(value)
    if (Array.isArray(resolved)) return resolved.length ? resolved : null
    return resolved ? [resolved] : null
}
function getResolvedElements(value: unknown): HTMLElement | HTMLElement[] | null {
    // do not call a function, unless it's a signal (to prevent creating new nodes)
    if (typeof value === 'function' && !value.length && value.name === 'bound readSignal')
        return getResolvedElements(value())
    if (Array.isArray(value)) {
        const results: HTMLElement[] = []
        for (const item of value) {
            const result = getResolvedElements(item)
            if (result)
                Array.isArray(result) ? results.push.apply(results, result) : results.push(result)
        }
        return results
    }
    return value instanceof HTMLElement ? value : null
}

/**
 * helper to getting to an owner that you want — walking downwards
 */
export function findOwner(
    root: Solid.Owner,
    predicate: (owner: Solid.Owner) => boolean,
): Solid.Owner | null {
    const queue: Solid.Owner[] = [root]
    for (const owner of queue) {
        if (predicate(owner)) return owner
        if (Array.isArray(owner.owned)) queue.push(...owner.owned)
    }
    return null
}

export function lookupOwner(
    owner: Solid.Owner,
    predicate: (owner: Solid.Owner) => boolean,
): Solid.Owner | null {
    do {
        if (predicate(owner)) return owner
        owner = owner.owner!
    } while (owner.owner)
    return null
}

/**
 * Attach onCleanup callback to a reactive owner
 * @param prepend add the callback to the front of the stack, instead of pushing, fot it to be called before other cleanup callbacks.
 * @returns a function to remove the cleanup callback
 */
export function onOwnerCleanup(
    owner: Solid.Owner,
    fn: VoidFunction,
    prepend = false,
    symbol?: symbol,
): VoidFunction {
    if (owner.cleanups === null) owner.cleanups = [fn]
    else {
        if (symbol) {
            if (owner.cleanups.some(c => (c as any)[symbol])) {
                return () =>
                    owner.cleanups?.splice(
                        owner.cleanups.findIndex(c => (c as any)[symbol]),
                        1,
                    )
            }
            ;(fn as any)[symbol] = true
        }
        if (prepend) owner.cleanups.unshift(fn)
        else owner.cleanups.push(fn)
    }
    return () => owner.cleanups?.splice(owner.cleanups.indexOf(fn), 1)
}

/**
 * Attach onCleanup callback to the parent of a reactive owner if it has one.
 * @param prepend add the callback to the front of the stack, instead of pushing, fot it to be called before other cleanup callbacks.
 * @returns a function to remove the cleanup callback
 */
export function onParentCleanup(
    owner: Solid.Owner,
    fn: VoidFunction,
    prepend = false,
    symbol?: symbol,
): VoidFunction {
    if (owner.owner) return onOwnerCleanup(owner.owner, fn, prepend, symbol)
    return () => {
        /* noop */
    }
}

/**
 * Listen to when the owner is disposed. (not on cleanup)
 */
export function onOwnerDispose(
    owner: Solid.Owner,
    fn: VoidFunction,
    prepend = false,
    symbol?: symbol,
): VoidFunction {
    if (isSolidRoot(owner)) return onOwnerCleanup(owner, fn, prepend, symbol)
    return onParentCleanup(owner, fn, prepend, symbol)
}

/**
 * Batches series of updates to a single array of updates.
 *
 * The updates are deduped by `id` property
 */
export function createBatchedUpdateEmitter<T>(emit: Emit<T[]>): (update: T) => void {
    const updates = new Set<T>()

    const triggerUpdateEmit = throttle(() => {
        emit([...updates])
        updates.clear()
    })

    return update => {
        updates.add(update)
        triggerUpdateEmit()
    }
}
