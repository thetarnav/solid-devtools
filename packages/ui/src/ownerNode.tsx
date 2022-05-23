import { GraphOwner, GraphSignal, OwnerType } from "@shared/graph"
import { Component, For, JSX, Show } from "solid-js"
import { DeepReadonly } from "solid-js/store"
import { colors, hexToRgb, tw } from "./twind"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
import { Signals } from "./signalNode"
// import {TransitionGroup} from "solid-transition-group"

const highlightRgba = hexToRgb(colors.cyan[400], 0.6)

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
			<div class={tw`pr-2`}>
				<p>
					<span
						class={tw`px-1 py-0.5 rounded transition-color`}
						style={{
							"background-color": rerun() ? highlightRgba : null,
						}}
					>
						<span class={tw`italic font-medium`}>
							{type === OwnerType.Component ? `<${name}>` : name}{" "}
						</span>
						<span class={tw`ml-2 text-[10px] opacity-40`}>{typeName}</span>
					</span>
				</p>

				<Show when={props.owner.signal}>{signal => <div>{signal.value}</div>}</Show>
				{/* <ValueNode value={value} /> */}
				{/* <div class="flex space-x-1">
					<DependencyCount n={dependencies().length} type="dependencies" />
					<Show when={dependents}>{d => <DependencyCount n={d().length} type="dependents" />}</Show>
				</div> */}
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
