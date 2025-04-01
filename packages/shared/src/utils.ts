export type Timeout = ReturnType<typeof setTimeout>

export type Union<T> = {
    [K in keyof T]: UnionMember<T, K>
}[keyof T]

export type UnionMember<T, K extends keyof T> = {
    kind: K,
    data: T[K],
}

export function assert(condition: any, message?: string, cause?: any): asserts condition {
    if (!condition) {
        throw Error(message ?? 'Assertion failed', {cause})
    }
}

export function msg<T, K extends keyof T>(kind: K, data: T[K]): UnionMember<T, K> {
    return {kind, data}
}

export const LOG_LABEL_CYAN = `\x1b[1;30m\x1b[46msolid-devtools\x1b[0m`

export function info<T>(data: T): T {
    // eslint-disable-next-line no-console
    console.info(LOG_LABEL_CYAN, data)
    return data
}

export function log(message: string, ...args: any[]): undefined {
    // eslint-disable-next-line no-console
    console.log(LOG_LABEL_CYAN+' '+message, ...args)
    return
}
export function warn(message: string, ...args: any[]): undefined {
    // eslint-disable-next-line no-console
    console.warn(LOG_LABEL_CYAN+' '+message, ...args)
    return
}

export function error(message: string, ...args: any[]): undefined {
    // eslint-disable-next-line no-console
    console.error(LOG_LABEL_CYAN+' '+message, ...args)
    return
}

export function log_message(to: string, from: string, e: {kind: string, data: any}) {
    // eslint-disable-next-line no-console
    console.log(`${LOG_LABEL_CYAN} \x1b[36m${to}\x1b[0m <- \x1b[36m${from}\x1b[0m: \x1b[35m${e.kind}\x1b[0m:`, e.data)
}

export function formatTime(d: Date = new Date()): string {
    return (
        ('0' + d.getHours()).slice(-2) +
        ':' +
        ('0' + d.getMinutes()).slice(-2) +
        ':' +
        ('0' + d.getSeconds()).slice(-2)
    )
}

export function interceptPropertySet<TObject extends object, TKey extends keyof TObject>(
    obj: TObject,
    key: TKey,
    cb: (value: TObject[TKey]) => void,
): void {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key)
    if (!descriptor) {
        let value: TObject[TKey] = obj[key]
        Object.defineProperty(obj, key, {
            set(newValue) {
                value = newValue
                cb(newValue)
            },
            get() {
                return value
            },
        })
        return
    }
    const {set} = descriptor
    if (!set) return
    Object.defineProperty(obj, key, {
        set(value) {
            cb(value)
            set.call(this, value)
        },
        get() {
            return descriptor.get?.call(this)
        },
    })
}

// TODO fix this in solid-primitives
export const asArray = <T>(value: T): (T extends any[] ? T[number] : T)[] =>
    Array.isArray(value) ? (value as any) : [value as any]

export const isObject = (o: unknown): o is object => typeof o === 'object' && !!o

export function callArrayProp<
    K extends PropertyKey,
    T extends (...args: Args) => void,
    Args extends unknown[],
>(object: {[_ in K]?: T[]}, key: K, ...args: Args): void {
    const arr = object[key]
    if (arr) for (const cb of arr) cb(...args)
}

export function pushToArrayProp<K extends PropertyKey, T>(
    object: {[_ in K]?: T[]},
    key: K,
    value: T,
): T[] {
    let arr = object[key]
    if (arr) arr.push(value)
    else arr = object[key] = [value]
    return arr
}

/** function that trims too long string */
export function trimString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength) + '…'
}

export function findIndexById<T extends {id: string}>(array: T[], id: string): number {
    for (let i = 0; i < array.length; i++) if (array[i]!.id === id) return i
    return -1
}

export function findItemById<T extends {id: string}>(array: T[], id: string): T | undefined {
    for (let i = 0; i < array.length; i++) {
        const item = array[i]!
        if (item.id === id) return item
    }
}

export const splitOnColon = <T extends string>(
    str: T,
): T extends `${infer L}:${infer R}` ? [L, R] : [T, null] => {
    const splitIndex = str.indexOf(':')
    if (splitIndex === -1) return [str, null] as any
    return [str.slice(0, splitIndex), str.slice(splitIndex + 1)] as any
}

export function whileArray<T, U>(
    toCheck: T[],
    callback: (item: T, toCheck: T[]) => U | undefined,
): U | undefined {
    let index = 0
    let current: T = toCheck[index++]!
    while (current) {
        const result = callback(current, toCheck)
        if (result !== undefined) return result
        current = toCheck[index++]!
    }
}

export type ToDyscriminatedUnion<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    T extends {},
    TK extends PropertyKey = 'type',
    DK extends void | PropertyKey = void,
> = {
    [K in keyof T]: {[k in TK]: K} & (DK extends PropertyKey ? {[k in DK]: T[K]} : T[K])
}[keyof T]

export function dedupeArrayById<T extends {id: unknown}>(input: T[]): T[] {
    const ids = new Set<unknown>()
    const deduped: T[] = []
    for (let i = input.length - 1; i >= 0; i--) {
        const update = input[i]!
        if (ids.has(update.id)) continue
        ids.add(update.id)
        deduped.push(update)
    }
    return deduped
}

export function mutate_filter<T>(array: T[], callback: (item: T) => boolean): void {
    for (let i = array.length - 1; i >= 0; i--) {
        if (!callback(array[i]!)) array.splice(i, 1)
    }
}

export function mutate_remove<T>(array: T[], item: T): void {
    const index = array.indexOf(item)
    if (index !== -1) array.splice(index, 1)
}
