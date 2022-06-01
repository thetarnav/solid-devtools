import { Accessor, Component, createEffect, createSignal, onCleanup } from "solid-js"
import { Portal, render } from "solid-js/web"
import { isProd } from "@solid-primitives/utils"
import { MappedComponent } from "@shared/graph"
import { sheet } from "@ui"

export function useLocator({ components }: { components: Accessor<MappedComponent[]> }): {
	enabled: Accessor<boolean>
} {
	// TODO: enable only when the page window is opened
	const [enabled, setEnabled] = createSignal(true)

	attachLocator()

	createEffect(() => {
		for (const comp of components()) {
			console.log(comp.name, comp.element)
		}
	})

	return { enabled }
}

function attachLocator() {
	if (isProd) return
	const root = (<div class="solid-devtools-locator"></div>) as HTMLDivElement
	const shadow = root.attachShadow({ mode: "open" })
	const inShadowRoot = document.createElement("div")
	shadow.appendChild(inShadowRoot)
	shadow.adoptedStyleSheets = [sheet.target]
	onCleanup(render(() => root, document.body))
	onCleanup(render(() => <Locator />, inShadowRoot))
}

const Locator: Component = props => {
	return <div>Hello :)</div>
}
