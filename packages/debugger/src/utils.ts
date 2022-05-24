import { SolidOwner } from "@shared/graph"
import { SafeValue } from "@shared/messanger"

const literalTypes = ["bigint", "number", "boolean", "string", "undefined"]

export function getSafeValue(value: unknown): SafeValue {
	if (literalTypes.includes(typeof value)) return value as SafeValue
	return value + ""
}

/** helper to getting to an owner that you want */
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

let LAST_ID = 0
export const getNewSdtId = () => LAST_ID++
