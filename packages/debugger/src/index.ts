import { FlowComponent, createEffect, getOwner } from "solid-js"
import { postWindowMessage, MESSAGE } from "@shared/messanger"
import { createGraphRoot } from "./update"

postWindowMessage(MESSAGE.SolidOnPage)

export const Debugger: FlowComponent = props => {
	const root = getOwner()!
	const tree = createGraphRoot(root)

	createEffect(() => {
		postWindowMessage(MESSAGE.SolidUpdate, tree)
	})

	return props.children
}
