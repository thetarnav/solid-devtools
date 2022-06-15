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
import { isProd } from "@solid-primitives/utils"
import { createElementBounds } from "@solid-primitives/bounds"
import { makeEventListener } from "@solid-primitives/event-listener"
import { MappedComponent } from "@shared/graph"
import type { ElementLocation } from "@solid-devtools/babel-plugin"
import { sheet, tw } from "@solid-devtools/ui"
import { clearFindComponentCache, findComponent } from "./findComponent"
import { makeHoverElementListener } from "./hoverElement"
import { createElementCursor } from "./elementCursor"
import { openCodeSource, TargetIDE, TargetURLFunction } from "./goToSource"
import { makeHoldKeyListener } from "./holdKeyListener"

// TODO: contribute to solid-primitives
const stopPropagation =
	<E extends Event>(callback: (event: E) => void): ((event: E) => void) =>
	e => {
		e.stopPropagation()
		callback(e)
	}

const preventDefault =
	<E extends Event>(callback: (event: E) => void): ((event: E) => void) =>
	e => {
		e.preventDefault()
		callback(e)
	}

export type SelectedComponent = {
	name: string
	element: HTMLElement
	location: (ElementLocation & { element: HTMLElement }) | null
}

export type { TargetIDE, TargetURLFunction } from "./goToSource"

export type LocatorOptions = {
	components: Accessor<MappedComponent[]>
	targetIDE?: false | TargetIDE | TargetURLFunction
	key?: "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | (string & {})
}

const [selected, setSelected] = createSignal<SelectedComponent | null>(null, { internal: true })
const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null, { internal: true })

function openSelectedComponentSource(target: TargetIDE | TargetURLFunction): void {
	const comp = selected()
	if (!comp || !comp.location) return
	const { path, line, column } = comp.location
	openCodeSource(target, path, line, column)
}

export function useLocator({ components, targetIDE, key = "altKey" }: LocatorOptions): {
	enabled: Accessor<boolean>
} {
	if (isProd) return { enabled: () => false }

	const [inLocatorMode, setInLocatorMode] = createSignal(false)

	makeHoldKeyListener(key, setInLocatorMode, true)

	onCleanup(setHoverTarget.bind(void 0, null))
	onCleanup(setSelected.bind(void 0, null))

	attachLocator()

	makeHoverElementListener(setHoverTarget)

	createComputed(on(components, clearFindComponentCache))

	createComputed(() => {
		if (!inLocatorMode()) setSelected(null)
		else {
			// defferred computed inside of computed
			// this is to prevent calculating selected with old components array
			// data flow: enable inLocatorMode() -> trigger outer computed -> components() updated -> trigger defferred computed
			createComputed(
				on([components, hoverTarget], inputs => setSelected(findComponent(...inputs)), {
					defer: true,
				}),
			)
		}
	})

	if (targetIDE) {
		// set pointer cursor to selected component
		createElementCursor(() => selected()?.location?.element)

		// go to selected component source code on click
		createEffect(() => {
			if (!inLocatorMode()) return
			makeEventListener(
				window,
				"click",
				preventDefault(stopPropagation(openSelectedComponentSource.bind(null, targetIDE))),
				true,
			)
		})
	}

	return { enabled: inLocatorMode }
}

function attachLocator() {
	if (isProd) return

	const highlightElement = createMemo(
		on(selected, c => (c ? c.location?.element ?? c.element : null)),
	)
	const bounds = createElementBounds(highlightElement)

	return (
		<Portal useShadow ref={({ shadowRoot }) => (shadowRoot.adoptedStyleSheets = [sheet.target])}>
			<ElementOverlay
				tag={highlightElement()?.tagName.toLocaleLowerCase()}
				selected={!!selected()}
				name={selected()?.name}
				{...bounds}
			/>
		</Portal>
	)
}

const ElementOverlay: Component<{
	left: number | null
	top: number | null
	width: number | null
	height: number | null
	name: string | undefined
	tag: string | undefined
	selected: boolean
}> = props => {
	const left = createMemo<number>(prev => (props.left === null ? prev : props.left), 0)
	const top = createMemo<number>(prev => (props.top === null ? prev : props.top), 0)
	const width = createMemo<number>(prev => (props.width === null ? prev : props.width), 0)
	const height = createMemo<number>(prev => (props.height === null ? prev : props.height), 0)
	const transform = createMemo(() => `translate(${Math.round(left())}px, ${Math.round(top())}px)`)

	return (
		<div
			class={tw`fixed z-9999 top-0 left-0 pointer-events-none transition-all duration-100`}
			style={{
				transform: transform(),
				width: width() + "px",
				height: height() + "px",
				opacity: selected() ? 1 : 0,
			}}
		>
			<div
				class={tw`absolute -inset-2 rounded border-2 border-cyan-800 border-opacity-80 bg-cyan-800 bg-opacity-30`}
			/>
			<Presence>
				<Show when={!!props.name}>
					<Motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						class={tw`absolute top-full inset-x-0 flex justify-center`}
					>
						<div class={tw`relative mt-3 py-1 px-2 bg-cyan-900 bg-opacity-80 rounded`}>
							<span>
								{props.name}: {props.tag}
							</span>
						</div>
					</Motion.div>
				</Show>
			</Presence>
		</div>
	)
}
