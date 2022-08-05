import { style, createVar } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { insetX, insetY, rounded, theme } from "../theme"

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

export const bgColorVar: CSSVarFunction = createVar()

export const HighlightText = {
  span: style({
    position: "relative",
    // TODO: transition-color
  }),
  highlight: style({
    position: "absolute",
    zIndex: -1,
    ...insetX(1),
    ...insetY(0),
    ...rounded(),
    // TODO: transition-color
  }),
}
