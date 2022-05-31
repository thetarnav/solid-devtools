import { Accessor, createEffect, createSignal } from "solid-js"

export type Component = {
	name: string
	element: Element
}

export function useLocator({ components }: { components: Accessor<Component[]> }): {
	enabled: Accessor<boolean>
} {
	const [enabled, setEnabled] = createSignal(false)

	createEffect(() => {
		console.log("Components", [...components()])
	})

	return { enabled }
}
