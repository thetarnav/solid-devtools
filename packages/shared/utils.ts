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
