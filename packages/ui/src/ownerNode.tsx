import { ReactiveGraphOwner, OwnerType } from "@shared/graph"
import { For, JSX, Show } from "solid-js"
import { DeepReadonly } from "solid-js/store"
import { tw } from "./twind"
import { TransitionGroup, animateExit, animateEnter } from "@otonashixav/solid-flip"
// import {TransitionGroup} from "solid-transition-group"

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
			class={tw`bg-cyan-200 bg-opacity-5 border-0 border-t-[1px] border-l-[1px] border-cyan-900 border-opacity-30 outline-[1px] pt-1 pl-0.5`}
		>
			<div
				class={tw`pb-1 pr-2`}
				style={{
					// TODO: better styles for computation rerun
					"background-color": props.owner.rerun ? "red" : null,
				}}
			>
				<p class={tw`italic pb-0.5`}>
					{type === OwnerType.Component ? `<${name}>` : name}{" "}
					<span class={tw`text-[10px] opacity-40`}>{typeName}</span>
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
			<div class={tw`pl-4 pt-1`}>
				<OwnerChildren children={children()} />
			</div>
			{/* </Show> */}
		</div>
	)
}
