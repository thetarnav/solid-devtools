import { GraphOwner, OwnerType } from "@shared/graph"
import { For, JSX, Show } from "solid-js"
import { DeepReadonly } from "solid-js/store"
import { colors, hexToRgb, tw } from "./twind"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
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
			class={tw`bg-cyan-200 bg-opacity-5 border-0 border-t-[1px] border-l-[1px] border-cyan-900 border-opacity-30 outline-[1px] pt-1 pl-1`}
		>
			<div class={tw`pr-2`}>
				<p>
					<span
						class={tw`
							pl-1 pr-1 pb-0.5 pt-0.5
							rounded italic
							transition-color
						`}
						style={{
							"background-color": rerun() ? highlightRgba : null,
						}}
					>
						{type === OwnerType.Component ? `<${name}>` : name}{" "}
						<span class={tw`text-[10px] opacity-40`}>{typeName}</span>
					</span>
				</p>

				<Show when={props.owner.signal}>{signal => <div>{signal.value}</div>}</Show>
				{/* <ValueNode value={value} /> */}
				{/* <div class="flex space-x-1">
					<DependencyCount n={dependencies().length} type="dependencies" />
					<Show when={dependents}>{d => <DependencyCount n={d().length} type="dependents" />}</Show>
				</div> */}
			</div>
			<Show when={signals().length}>
				<div>
					<For each={signals()}>
						{signal => (
							<div>
								{signal.name} — {JSON.stringify(signal.value)}
							</div>
						)}
					</For>
				</div>
			</Show>
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
