import { Component, getOwner } from "solid-js"
import { postWindowMessage, MESSAGE } from "@shared/messanger"

postWindowMessage(MESSAGE.SolidOnPage, true)

export const Devtools: Component = props => {
	console.log("owner in lib", getOwner())
	return props.children
}
