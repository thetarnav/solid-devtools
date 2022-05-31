import { Accessor, createEffect } from "solid-js"

export type Component = {
	name: string
	element: Element
}

export function useLocator({ components }: { components: Accessor<Component[]> }) {
	console.log("Locator used")

	createEffect(() => {
		console.log("Components", [...components()])
	})
}
