import { style } from "@vanilla-extract/css"
import { insetX, insetY, rounded, theme, transition } from "../theme"

const { spacing, color } = theme

export const Signals = {
  container: style({
    margin: `${spacing[1]} 0`,
  }),
}

export const SignalNode = {
  container: style({
    display: "flex",
    alignItems: "center",
    paddingLeft: spacing[1],
    paddingRight: spacing[1],
    height: spacing[5],
  }),
  name: style({
    width: spacing[36],
    fontStyle: "italic",
    color: color.gray[800],
  }),
}

export const ValueNode = style({
  color: color.amber[600],
  minWidth: spacing[4],
  height: spacing[5],
})

export const HighlightText = {
  span: style({
    position: "relative",
    display: "flex",
    alignItems: "center",
    ...transition("background-color"),
  }),
  highlight: style({
    position: "absolute",
    zIndex: -1,
    ...insetX(`-${spacing[1]}`),
    ...insetY(0),
    ...rounded(),
    ...transition("background-color"),
  }),
}
