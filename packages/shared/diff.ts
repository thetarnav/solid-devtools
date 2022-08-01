// TODO: contribute to solid primitives

//
// DIFF BY ID
//

export function handleDiffArrayById<T extends { id: unknown }>(
	a: readonly T[],
	b: readonly T[],
	handleAdded: (item: T) => void,
	handleRemoved: (item: T) => void,
	handleUpdated: (item: T) => void,
): void {
	const bCopy = b.slice()
	for (const aEl of a) {
		const bIndex = bCopy.findIndex(bEl => bEl.id === aEl.id)
		if (bIndex === -1) handleRemoved(aEl)
		else handleUpdated(bCopy.splice(bIndex, 1)[0])
	}
	for (const bEl of bCopy) handleAdded(bEl)
}

export function getArrayDiffById<T extends { id: any }, ID extends T["id"]>(
	a: readonly T[],
	b: readonly T[],
): {
	added: T[]
	removed: ID[]
	updated: T[]
} {
	const added: T[] = []
	const removed: ID[] = []
	const updated: T[] = []
	handleDiffArrayById(
		a,
		b,
		added.push.bind(added),
		e => removed.push(e.id),
		updated.push.bind(updated),
	)
	return { added, removed, updated }
}
