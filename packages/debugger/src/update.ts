import { Accessor, createSignal } from "solid-js"
import { GraphRoot, MappedOwner, Owner } from "@shared/graph"
import { mapOwnerTree } from "./walker"

let ROOT_ID = 0

export function createOwnerObserver(owner: Owner, onUpdate: (tree: MappedOwner[]) => void) {
	setTimeout(() => {
		const tree = mapOwnerTree(owner)
		onUpdate(tree)
	})
}

export function createGraphRoot(root: Owner): GraphRoot {
	const [tree, setTree] = createSignal<MappedOwner[]>([])
	createOwnerObserver(root, setTree)
	return {
		id: ROOT_ID++,
		get children() {
			return tree()
		},
	}
}
