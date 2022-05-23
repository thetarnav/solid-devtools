import { Component, For, JSX, ParentComponent, Show, splitProps } from "solid-js"
import { combineProps } from "@solid-primitives/props"
import { GraphSignal } from "@shared/graph"
import { tw, colors, hexToRgb } from "./twind"

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
			<div class={tw`w-36 italic text-gray-800`}>{props.name}</div>
			<ValueNode value={props.value} updated={props.updated} />
		</div>
	)
}

export const ValueNode: Component<{
	updated?: boolean
	highlighted?: boolean
	value: unknown
}> = props => {
	return (
		<HighlightText
			strong={props.updated}
			light={props.highlighted}
			bgColor={colors.amber[400]}
			textColor
			class={tw`text-amber-600 min-w-4 h-5`}
		>
			{JSON.stringify(props.value)}
		</HighlightText>
	)
}

export const HighlightText: ParentComponent<
	{
		textColor?: string | true
		bgColor?: string | true
		strong?: boolean
		light?: boolean
	} & JSX.HTMLAttributes<HTMLSpanElement>
> = props => {
	const bg = props.bgColor === true ? colors.cyan[400] : props.bgColor
	const color = props.textColor === true ? colors.black : props.textColor
	const bgStrong = bg ? hexToRgb(bg, 0.6) : null
	const bgLight = bg ? hexToRgb(bg, 0.3) : null
	const colorStrong = color ? hexToRgb(color, 0.6) : null
	const colorLight = color ? hexToRgb(color, 0.3) : null
	const [, attrs] = splitProps(props, ["textColor", "bgColor", "strong", "light"])
	return (
		<span
			{...combineProps(attrs, { class: tw`relative transition-color` })}
			style={{ color: props.strong ? colorStrong : props.light ? colorLight : null }}
		>
			<div
				class={tw`
					absolute -z-1 -inset-x-2 inset-y-0
					rounded transition-color
				`}
				style={{ "background-color": props.strong ? bgStrong : props.light ? bgLight : null }}
			></div>
			{props.children}
		</span>
	)
}
