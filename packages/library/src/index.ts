import { Component, getOwner } from "solid-js"
import { postWindowMessage, MESSAGE } from "@shared/messanger"
import { mapOwnerTree } from "./walker"

postWindowMessage(MESSAGE.SolidOnPage, true)

export const Devtools: Component = props => {
	const root = getOwner()!
	console.log("owner in lib", root)

	setTimeout(() => {
		const tree = mapOwnerTree(root)
		console.log(tree)
		postWindowMessage(MESSAGE.SolidUpdate, tree)
	})

	return props.children
}
