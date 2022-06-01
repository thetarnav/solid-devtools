import { MappedComponent } from "@shared/graph"
import { Accessor, createEffect, createSignal } from "solid-js"

export function useLocator({ components }: { components: Accessor<MappedComponent[]> }): {
	enabled: Accessor<boolean>
} {
	// TODO: enable only when the page window is opened
	const [enabled, setEnabled] = createSignal(true)

	createEffect(() => {
		for (const comp of components()) {
			console.log(comp.name, comp.element)
		}
	})

	return { enabled }
}
