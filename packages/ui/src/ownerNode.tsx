import { ReactiveGraphOwner, OwnerType } from "@shared/graph"
import { For, JSX, Show } from "solid-js"
import { DeepReadonly } from "solid-js/store"
import { colors, tw } from "./twind"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
// import {TransitionGroup} from "solid-transition-group"

function hexToRgb(hex: string, alpha?: number) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	if (!result) return null
	const r = parseInt(result[1], 16),
		g = parseInt(result[2], 16),
		b = parseInt(result[3], 16)
	return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b}, ${alpha})`
}

const highlightRgba = hexToRgb(colors.cyan[400], 0.6)

export function OwnerChildren(props: { children: DeepReadonly<ReactiveGraphOwner[]> }) {
	return (
		<TransitionGroup enter={animateEnter()} exit={animateExit()}>
			<For each={props.children}>{o => <OwnerNode owner={o} />}</For>
		</TransitionGroup>
	)
}

export function OwnerNode(props: { owner: DeepReadonly<ReactiveGraphOwner> }): JSX.Element {
	const { name, type } = props.owner
	const children = () => props.owner.children
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
							"background-color": props.owner.rerun ? highlightRgba : null,
						}}
					>
						{type === OwnerType.Component ? `<${name}>` : name}{" "}
						<span class={tw`text-[10px] opacity-40`}>{typeName}</span>
					</span>
				</p>
				{/* <ValueNode value={value} />
				<div class="flex space-x-1">
					<DependencyCount n={dependencies().length} type="dependencies" />
					<Show when={dependents}>{d => <DependencyCount n={d().length} type="dependents" />}</Show>
				</div> */}
			</div>
			{/* <Show when={stateEntries.length}>
				<div>
					<For each={stateEntries}>
						{([name, value]) => <StateNode name={name} value={value()} />}
					</For>
				</div>
			</Show> */}
			{/* <Show when={children().length}> */}
			<div
				class={tw`pl-4 pt-1 transition-opacity duration-500`}
				style={{
					opacity: props.owner.rerun ? 0.3 : 1,
				}}
			>
				<OwnerChildren children={children()} />
			</div>
			{/* </Show> */}
		</div>
	)
}
