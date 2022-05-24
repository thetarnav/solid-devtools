import { AnyFunction } from "@solid-primitives/utils"

export const pushToArrayProp = <K extends PropertyKey, F extends AnyFunction>(
	object: { [_ in K]?: F[] },
	key: K,
	func: F,
): F[] => {
	let arr = object[key]
	if (arr) arr.push(func)
	else arr = object[key] = [func]
	return arr
}
