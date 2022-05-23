import { GraphSignal } from "@shared/graph"
import { Component, For, JSX, Show } from "solid-js"
import { tw } from "./twind"

export const Signals: Component<{ each: GraphSignal[] }> = props => {
	return (
		<Show when={props.each.length}>
			<div class={tw`my-1`}>
				<For each={props.each}>{signal => <SignalNode {...signal} />}</For>
			</div>
		</Show>
	)
}

export const SignalNode: Component<GraphSignal> = props => {
	return (
		<div class={tw`px-1 h-5 flex items-center`}>
			<div class={tw`w-32 italic text-gray-800`}>{props.name}</div>
			<div class={tw`w-32`}>
				<span
					class={tw`relative ${props.updated ? "text-black" : "text-amber-600"} transition-color`}
				>
					<div
						class={tw`
              absolute -z-1 -inset-x-1 -inset-y-0.5 min-w-4
              ${props.updated && "bg-amber-500"}
              bg-opacity-60 rounded transition-color
            `}
					></div>
					{JSON.stringify(props.value)}
				</span>
			</div>
		</div>
	)
}
