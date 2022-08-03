export function callArrayProp<
  K extends PropertyKey,
  T extends (...args: Args) => void,
  Args extends unknown[],
>(object: { [_ in K]?: T[] }, key: K, ...args: Args): void {
  const arr = object[key]
  if (arr) for (const cb of arr as T[]) cb(...args)
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
  return str.slice(0, maxLength) + "…"
}
