import { tw } from "@solid-devtools/ui"
import { animate } from "motion"
import { Component, createComputed, createMemo, Show, on, createEffect } from "solid-js"

export const ElementOverlay: Component<{
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
	const placeOnTop = createMemo(() => top() > window.innerHeight / 2)

	return (
		<div
			class={tw`fixed z-9999 top-0 left-0 pointer-events-none transition-all duration-100`}
			style={{
				transform: transform(),
				width: width() + "px",
				height: height() + "px",
				opacity: props.selected ? 1 : 0,
			}}
		>
			<div
				class={tw`absolute -inset-2 rounded border-2 border-cyan-800 border-opacity-80 bg-cyan-800 bg-opacity-30`}
			/>
			<Show when={!!props.name}>
				<div
					class={tw`absolute ${
						placeOnTop() ? "bottom-full" : "top-full"
					} inset-x-0 flex justify-center`}
				>
					<div
						class={tw`relative my-3 py-1 px-2`}
						ref={el => {
							let prevY = 0
							createComputed(
								on(placeOnTop, () => (prevY = el.getBoundingClientRect().top), { defer: true }),
							)
							createEffect(
								on(
									placeOnTop,
									() => {
										const currY = el.getBoundingClientRect().top
										animate(el, { y: [prevY - currY, 0] }, { duration: 0.15 })
									},
									{ defer: true },
								),
							)
						}}
					>
						<div class={tw`absolute inset-0 bg-cyan-900 bg-opacity-80 rounded`}></div>
						<div class={tw`absolute text-cyan-50 font-mono text-sm leading-4`}>
							{props.name}: <span class={tw`text-cyan-200`}>{props.tag}</span>
						</div>
						<div class={tw`font-mono text-sm leading-4 invisible`}>
							{props.name}: {props.tag}
						</div>
					</div>
				</div>
			</Show>
		</div>
	)
}
