import { MappedOwner } from "@shared/graph"
import { For, JSX, Show } from "solid-js"
import { DeepReadonly } from "solid-js/store"

export function OwnerNode(props: { owner: DeepReadonly<MappedOwner> }): JSX.Element {
	const { name, type } = props.owner
	const children = () => props.owner.children

	let ref!: HTMLDivElement

	return (
		<div
			ref={ref}
			class="bg-cyan-200/10 border-0 border-t-1px border-l-1px border-cyan-900/30 outline-1px caption text-12px pt-1 pl-0.5"
		>
			<div class="pb-1 pr-2">
				<p class="italic pb-0.5">
					{name} <span class="text-10px opacity-40">{type}</span>
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
			<Show when={children().length}>
				<div class="pl-4 pt-1">
					<For each={children()}>{o => <OwnerNode owner={o} />}</For>
				</div>
			</Show>
		</div>
	)
}
