import {
	Accessor,
	Component,
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js"
import { Portal } from "solid-js/web"
import { isProd } from "@solid-primitives/utils"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createElementBounds } from "@solid-primitives/bounds"
import { MappedComponent } from "@shared/graph"
import { colors, sheet, tw } from "@ui"
import { clearFindComponentCache, findComponent } from "./findComponent"

const [selected, setSelected] = createSignal<MappedComponent | null>(null, { internal: true })
const [hoverTarget, setHoverTarget] = createSignal<Element | null>(null, { internal: true })
const updateHoverTarget = (e: Event) =>
	setHoverTarget(e.target instanceof Element ? e.target : null)

export function useLocator({ components }: { components: Accessor<MappedComponent[]> }): {
	enabled: Accessor<boolean>
} {
	// TODO: enable only when the page window is opened
	const [enabled, setEnabled] = createSignal(true, { internal: true })
	onCleanup(setHoverTarget.bind(void 0, null))

	attachLocator()

	createEffect(() => {
		if (!enabled()) return setHoverTarget(null)
		// makeEventListener(window, "mouseover", e => console.log(e.target instanceof Element))
		makeEventListener(window, "pointerover", updateHoverTarget)
		makeEventListener(document, "mouseleave", setHoverTarget.bind(void 0, null))
	})

	createComputed(on(components, clearFindComponentCache))
	const selectedComp = createMemo(findComponent.bind(components, hoverTarget))
	createComputed(on(selectedComp, setSelected))
	onCleanup(setSelected.bind(void 0, null))

	createEffect(() => console.log(selectedComp()))

	return { enabled }
}

function attachLocator() {
	if (isProd) return

	const bounds = createElementBounds(() => selected()?.element)

	return (
		<Portal
			useShadow
			ref={(container: HTMLDivElement & { shadowRoot: ShadowRoot }) =>
				(container.shadowRoot.adoptedStyleSheets = [sheet.target])
			}
		>
			<ElementOverlay selected={!!selected()} {...bounds} />
		</Portal>
	)
}

const ElementOverlay: Component<{
	left: number | null
	top: number | null
	width: number | null
	height: number | null
	selected: boolean
}> = props => {
	const left = createMemo<number>(prev => (props.left === null ? prev : props.left), 0)
	const top = createMemo<number>(prev => (props.top === null ? prev : props.top), 0)
	const width = createMemo<number>(prev => (props.width === null ? prev : props.width), 0)
	const height = createMemo<number>(prev => (props.height === null ? prev : props.height), 0)
	const transform = createMemo(() => `translate(${Math.round(left())}px, ${Math.round(top())}px)`)

	return (
		<div
			class={tw`fixed top-0 left-0 pointer-events-none rounded mix-blend-difference transition-all duration-100`}
			style={{
				outline: `8px solid ${colors.cyan[900]}`,
				transform: transform(),
				width: width() + "px",
				height: height() + "px",
				opacity: selected() ? 1 : 0,
			}}
		></div>
	)
}
