import { JSX, ParentComponent, splitProps } from "solid-js"
import { combineProps } from "@solid-primitives/props"
import { hexToRgb, theme } from "../theme"
import * as styles from "./Highlight.css"

export const HighlightText: ParentComponent<
  {
    textColor?: string | true
    bgColor?: string | true
    strong?: boolean
    light?: boolean
  } & JSX.HTMLAttributes<HTMLSpanElement>
> = props => {
  const bg = props.bgColor === true ? theme.color.cyan[400] : props.bgColor
  const color = props.textColor === true ? theme.color.black : props.textColor
  const bgStrong = bg ? hexToRgb(bg, 0.7) : null
  const bgLight = bg ? hexToRgb(bg, 0.4) : null
  const colorStrong = color ? hexToRgb(color, 0.7) : null
  const colorLight = color ? hexToRgb(color, 0.4) : null
  const [, attrs] = splitProps(props, ["textColor", "bgColor", "strong", "light"])
  return (
    <span
      {...combineProps(attrs, { class: styles.span })}
      style={{ color: props.strong ? colorStrong : props.light ? colorLight : null }}
    >
      <div
        class={styles.highlight}
        style={{ "background-color": props.strong ? bgStrong : props.light ? bgLight : null }}
      ></div>
      {props.children}
    </span>
  )
}
