import { JSX, ParentComponent, splitProps } from "solid-js"
import { combineProps } from "@solid-primitives/props"
import { clsx } from "clsx"
import { color } from "../theme"
import * as styles from "./Highlight.css"
import { assignInlineVars } from "@vanilla-extract/dynamic"

const localPropKeys = ["signal", "strong", "light"] as const

export const Highlight: ParentComponent<
  {
    signal?: boolean
    strong?: boolean
    light?: boolean
  } & JSX.HTMLAttributes<HTMLDivElement>
> = props => {
  const [, attrs] = splitProps(props, localPropKeys)
  return (
    <div
      {...combineProps(attrs, {
        class: clsx(styles.container, props.strong && styles.setColor),
      })}
    >
      <div
        class={styles.highlight}
        style={assignInlineVars({
          [styles.bgColorVar]: props.signal ? color.amber[400] : color.cyan[400],
          [styles.bgOpacityVar]: props.strong ? "0.7" : props.light ? "0.4" : "0",
        })}
      ></div>
      {props.children}
    </div>
  )
}
