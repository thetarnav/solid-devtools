import { Solid } from '@solid-devtools/debugger/types'
import { createComputed, createRoot, getOwner, runWithOwner } from 'solid-js'

export function getFunctionSources(fn: () => unknown): Solid.Signal[] {
    let nodes: Solid.Signal[] | undefined
    let init = true
    runWithOwner(null as any, () =>
        createRoot(dispose =>
            createComputed(() => {
                if (!init) return
                init = false
                fn()
                const sources = (getOwner() as Solid.Computation).sources
                if (sources) nodes = [...sources]
                dispose()
            }),
        ),
    )
    return nodes ?? []
}

/**
 * For measuring the time elapsed. Returns a function that will return the time elapsed since it's last call.
 * */
export function makeTimeMeter(): () => number {
    let last = performance.now()
    return () => {
        const now = performance.now()
        const diff = now - last
        last = now
        return Math.round(diff)
    }
}

export function getDiffMap<T extends object>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor?: WeakMapConstructor,
): [(item: T) => 'added' | 'removed' | null, T[]]
export function getDiffMap<T>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor: MapConstructor,
): [(item: T) => 'added' | 'removed' | null, T[]]
export function getDiffMap<T extends object>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor: WeakMapConstructor | MapConstructor = WeakMap,
): [(item: T) => 'added' | 'removed' | null, T[]] {
    const marks: Map<T, 'added' | 'removed'> = new (mapConstructor as any)()
    const allItems: T[] = []
    const toCopy = [...to]

    from.forEach(owner => {
        const index = toCopy.indexOf(owner)
        if (index !== -1) toCopy.splice(index, 1)
        else marks.set(owner, 'removed')
        allItems.push(owner)
    })
    toCopy.forEach(owner => {
        if (allItems.includes(owner)) return
        marks.set(owner, 'added')
        allItems.push(owner)
    })

    return [item => marks.get(item) || null, allItems]
}

export function getStackDiffMap<T extends object>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor?: WeakMapConstructor,
): [(item: T) => 'added' | null, T[]]
export function getStackDiffMap<T>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor: MapConstructor,
): [(item: T) => 'added' | null, T[]]
export function getStackDiffMap<T>(
    from: readonly T[],
    to: readonly T[],
    mapConstructor: WeakMapConstructor | MapConstructor = WeakMap,
): [(item: T) => 'added' | null, T[]] {
    const marks: Map<T, 'added'> = new (mapConstructor as any)()
    const allItems: T[] = [...from]
    for (let i = allItems.length; i < to.length; i++) {
        allItems.push(to[i]!)
        marks.set(to[i]!, 'added')
    }
    return [item => marks.get(item) || null, allItems]
}
