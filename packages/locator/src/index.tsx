import {
	Accessor,
	Component,
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js"
import { Portal } from "solid-js/web"
import { Motion, Presence } from "@motionone/solid"
import { Rerun } from "@solid-primitives/keyed"
import { isProd } from "@solid-primitives/utils"
import { createElementBounds } from "@solid-primitives/bounds"
import { makeEventListener } from "@solid-primitives/event-listener"
import { MappedComponent } from "@shared/graph"
import { ElementLocation } from "@solid-devtools/babel-plugin"
import { sheet, tw } from "@ui"
import { clearFindComponentCache, findComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import { createElementCursor } from "./elementCursor"

export type SelectedComponent = {
	name: string
	element: HTMLElement
	location: (ElementLocation & { element: HTMLElement }) | null
}

const [selected, setSelected] = createSignal<SelectedComponent | null>(null, { internal: true })
const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null, { internal: true })

export function useLocator({ components }: { components: Accessor<MappedComponent[]> }): {
	enabled: Accessor<boolean>
} {
	if (isProd) return { enabled: () => false }

	const [inLocatorMode, setInLocatorMode] = createSignal(false)
	makeEventListener(window, "keydown", e => {
		if (e.key !== "Alt") return
		e.preventDefault()
		setInLocatorMode(true)
	})
	makeEventListener(window, "keyup", e => {
		if (e.key !== "Alt") return
		e.preventDefault()
		setInLocatorMode(false)
	})
	makeEventListener(document, "visibilitychange", () => {
		if (document.visibilityState !== "visible") setInLocatorMode(false)
	})

	onCleanup(setHoverTarget.bind(void 0, null))
	onCleanup(setSelected.bind(void 0, null))

	attachLocator()

	makeHoverElementListener(setHoverTarget)

	createComputed(on(components, clearFindComponentCache))
	const selectedComp = createMemo(() => {
		if (!inLocatorMode()) return null
		return findComponent.call(components, hoverTarget)
	})
	createComputed(on(selectedComp, setSelected))

	// set pointer cursor to selected component
	createElementCursor(() => selected()?.element)

	createEffect(() => console.log(selected()))

	return { enabled: inLocatorMode }
}

function attachLocator() {
	if (isProd) return

	const bounds = createElementBounds(() => selected()?.element)

	return (
		<Portal useShadow ref={({ shadowRoot }) => (shadowRoot.adoptedStyleSheets = [sheet.target])}>
			<ElementOverlay selected={!!selected()} name={selected()?.name} {...bounds} />
		</Portal>
	)
}

const ElementOverlay: Component<{
	left: number | null
	top: number | null
	width: number | null
	height: number | null
	name: string | undefined
	selected: boolean
}> = props => {
	const left = createMemo<number>(prev => (props.left === null ? prev : props.left), 0)
	const top = createMemo<number>(prev => (props.top === null ? prev : props.top), 0)
	const width = createMemo<number>(prev => (props.width === null ? prev : props.width), 0)
	const height = createMemo<number>(prev => (props.height === null ? prev : props.height), 0)
	const transform = createMemo(() => `translate(${Math.round(left())}px, ${Math.round(top())}px)`)

	return (
		<div
			class={tw`fixed top-0 left-0 pointer-events-none transition-all duration-100`}
			style={{
				transform: transform(),
				width: width() + "px",
				height: height() + "px",
				opacity: selected() ? 1 : 0,
			}}
		>
			<div class={tw`absolute -inset-2 rounded border-8 border-cyan-900 border-opacity-80`} />
			<Presence>
				<Show when={!!props.name}>
					<Motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						class={tw`absolute top-full inset-x-0 flex justify-center`}
					>
						<div class={tw`relative mt-3 py-1 px-2 bg-cyan-900 bg-opacity-80 rounded`}>
							<Presence exitBeforeEnter>
								<Rerun on={createMemo(() => props.name)}>
									<Motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: 4, transition: { duration: 0.2 } }}
										class={tw`absolute`}
									>
										{`<${props.name}>`}
									</Motion.span>
								</Rerun>
							</Presence>
							<span class={tw`invisible`}>{`<${props.name}>`}</span>
						</div>
					</Motion.div>
				</Show>
			</Presence>
		</div>
	)
}
