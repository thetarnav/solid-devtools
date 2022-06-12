import type { Accessor, Component } from "solid-js"

type HandProps = {
	rotate: Accessor<string>
	class: string
	length: number
	width: number
	fixed?: boolean
}

export const Hand: Component<HandProps> = ({ rotate, length, width, fixed, ...rest }) => (
	<line
		{...(fixed && { y1: length - 95 })}
		y2={-(fixed ? 95 : length)}
		stroke="currentColor"
		stroke-width={width}
		stroke-linecap="round"
		transform={rotate()}
		{...rest}
	/>
)
