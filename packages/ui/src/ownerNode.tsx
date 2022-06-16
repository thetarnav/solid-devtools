import { createEffect, For, JSX, onCleanup } from "solid-js"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { createHover } from "@solid-aria/interactions"
import { GraphOwner, OwnerType } from "@shared/graph"
import { tw } from "./twind"
import { HighlightText, Signals, ValueNode } from "./signalNode"
import { useHighlights } from "./ctx/highlights"

export function OwnerChildren(props: { children: GraphOwner[] }) {
	return (
		<TransitionGroup enter={animateEnter()} exit={animateExit()}>
			<For each={props.children}>{o => <OwnerNode owner={o} />}</For>
		</TransitionGroup>
	)
}

export function OwnerNode(props: { owner: GraphOwner }): JSX.Element {
	const { owner } = props
	const { name, type, signal } = owner
	const children = () => owner.children
	const signals = () => owner.signals
	const rerun = () => owner.updated
	const typeName = OwnerType[type]

	const { hoverProps, isHovered } = createHover({})

	const {
		highlightSourcesOf,
		cancelHightlightSourcesOf,
		highlightObserversOf,
		cancelHightlightObserversOf,
		isObserverHighlighted,
	} = useHighlights()

	const isHighlighted = isObserverHighlighted.bind(null, owner)

	createEffect(() => {
		if (isHovered()) highlightSourcesOf(owner)
		else cancelHightlightSourcesOf(owner)
	})
	onCleanup(() => cancelHightlightSourcesOf(owner))

	if (signal) {
		createEffect(() => {
			if (isHovered()) highlightObserversOf(signal)
			else cancelHightlightObserversOf(signal)
		})
		onCleanup(() => cancelHightlightObserversOf(signal))
	}

	return (
		<div
			class={tw`
				pt-1 pl-1
				bg-cyan-200 bg-opacity-5
				text-black
				border-0 border-t-[1px] border-l-[1px] border-cyan-900 border-opacity-30 outline-[1px]
			`}
		>
			<div class={tw`pl-1 pr-2 flex items-center`} {...hoverProps}>
				<div class={tw`w-36 flex items-center cursor-pointer`}>
					<HighlightText
						strong={rerun()}
						light={isHighlighted()}
						bgColor
						class={tw`italic font-medium`}
					>
						{type === OwnerType.Component ? `<${name}>` : name}
					</HighlightText>
					<div class={tw`ml-2 text-[10px] opacity-40 select-none`}>{typeName}</div>
				</div>
				{signal && <ValueNode value={signal.value} updated={signal.updated} />}
			</div>
			<Signals each={signals()} />
			{/* <Show when={children().length}> */}
			<div
				class={tw`pl-4 pt-1 transition-opacity duration-500`}
				style={{
					opacity: rerun() ? 0.3 : 1,
				}}
			>
				<OwnerChildren children={children()} />
			</div>
			{/* </Show> */}
		</div>
	)
}
