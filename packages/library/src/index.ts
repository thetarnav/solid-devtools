import { Component, getOwner } from "solid-js"
import { postWindowMessage } from "../../extension/shared/utils"
import { MESSAGE } from "../../extension/shared/variables"

postWindowMessage(MESSAGE.SolidOnPage, true)

export const Devtools: Component = props => {
	console.log("owner in lib", getOwner())
	return props.children
}
