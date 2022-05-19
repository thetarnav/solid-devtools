import { SafeValue } from "@shared/messanger"

const literalTypes = ["bigint", "number", "boolean", "string", "undefined"]

export function getSafeValue(value: unknown): SafeValue {
	if (literalTypes.includes(typeof value)) return value as SafeValue
	return value + ""
}
