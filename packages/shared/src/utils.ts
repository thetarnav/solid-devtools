const getLogLabel = () => [
  `%csolid-devtools`,
  'color: #fff; background: #2c4f7c; padding: 1px 4px;',
]

export function info<T>(data: T): T {
  // eslint-disable-next-line no-console
  console.info(...getLogLabel(), data)
  return data
}

export function log(...args: any[]): undefined {
  // eslint-disable-next-line no-console
  console.log(...getLogLabel(), ...args)
  return
}
export function warn(...args: any[]): undefined {
  // eslint-disable-next-line no-console
  console.warn(...getLogLabel(), ...args)
  return
}

export function error(...args: any[]): undefined {
  // eslint-disable-next-line no-console
  console.error(...getLogLabel(), ...args)
  return
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
  const { set } = descriptor
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
  Array.isArray(value) ? (value as any) : [value]

export const createCallbackStack = <A0 = void, A1 = void, A2 = void, A3 = void>(): {
  push: (...callbacks: ((arg0: A0, arg1: A1, arg2: A2, arg3: A3) => void)[]) => void
  execute: (arg0: A0, arg1: A1, arg2: A2, arg3: A3) => void
  clear: VoidFunction
} => {
  let stack: Array<(arg0: A0, arg1: A1, arg2: A2, arg3: A3) => void> = []
  const clear: VoidFunction = () => (stack = [])
  return {
    push: (...callbacks) => stack.push(...callbacks),
    execute(arg0, arg1, arg2, arg3) {
      stack.forEach(cb => cb(arg0, arg1, arg2, arg3))
      clear()
    },
    clear,
  }
}

export function callArrayProp<
  K extends PropertyKey,
  T extends (...args: Args) => void,
  Args extends unknown[],
>(object: { [_ in K]?: T[] }, key: K, ...args: Args): void {
  const arr = object[key]
  if (arr) for (const cb of arr) cb(...args)
}

export function pushToArrayProp<K extends PropertyKey, T>(
  object: { [_ in K]?: T[] },
  key: K,
  value: T,
): T[] {
  let arr = object[key]
  if (arr) arr.push(value)
  else arr = object[key] = [value]
  return arr
}

export function mutateFilter<T, S extends T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => value is S,
): void
export function mutateFilter<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): void
export function mutateFilter<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => unknown,
): void {
  const temp = array.filter(predicate)
  array.length = 0
  array.push.apply(array, temp)
}

export function mutateRemove<T>(array: T[], item: T): void {
  array.splice(array.indexOf(item), 1)
}

export const dedupeArray = <T>(array: readonly T[]) => Array.from(new Set(array))

/** Checks if both arrays contain the same values. Order doesn't matter. */
export const arrayRefEquals = <T>(a: readonly T[], b: readonly T[]) =>
  a === b || (a.length === b.length && a.every(e => b.includes(e)))

/** function that trims too long string */
export function trimString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function findIndexById<T extends { id: string }>(array: T[], id: string): number {
  for (let i = 0; i < array.length; i++) if (array[i]!.id === id) return i
  return -1
}

export function findItemById<T extends { id: string }>(array: T[], id: string): T | undefined {
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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

export const XOR = (a: unknown, b: unknown) => (a || b) && !(a && b)

export type ToDyscriminatedUnion<
  T extends {},
  TK extends PropertyKey = 'type',
  DK extends void | PropertyKey = void,
> = {
  [K in keyof T]: { [k in TK]: K } & (DK extends PropertyKey ? { [k in DK]: T[K] } : T[K])
}[keyof T]

export function dedupeArrayById<T extends { id: unknown }>(input: T[]): T[] {
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
