import { GraphOwner, OwnerType } from "@shared/graph"
import { For, JSX, Show } from "solid-js"
import { tw } from "./twind"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { HighlightText, Signals, ValueNode } from "./signalNode"

export function OwnerChildren(props: { children: GraphOwner[] }) {
	return (
		<TransitionGroup enter={animateEnter()} exit={animateExit()}>
			<For each={props.children}>{o => <OwnerNode owner={o} />}</For>
		</TransitionGroup>
	)
}

export function OwnerNode(props: { owner: GraphOwner }): JSX.Element {
	const { name, type } = props.owner
	const children = () => props.owner.children
	const signals = () => props.owner.signals
	const rerun = () => props.owner.rerun
	const typeName = OwnerType[type]

	let ref!: HTMLDivElement

	return (
		<div
			ref={ref}
			class={tw`
				pt-1 pl-1
				bg-cyan-200 bg-opacity-5
				text-black
				border-0 border-t-[1px] border-l-[1px] border-cyan-900 border-opacity-30 outline-[1px]
			`}
		>
			<div class={tw`pl-1 pr-2 flex items-center`}>
				<div class={tw`w-36 flex items-center`}>
					<HighlightText strong={rerun()} bgColor class={tw`italic font-medium`}>
						{type === OwnerType.Component ? `<${name}>` : name}
					</HighlightText>
					<div class={tw`ml-2 text-[10px] opacity-40`}>{typeName}</div>
				</div>
				<Show when={props.owner.signal}>
					{signal => <ValueNode value={signal.value} updated={signal.updated} />}
				</Show>
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
